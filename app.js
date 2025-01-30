document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const container = document.getElementById('checklist-container');
    const newItemInput = document.getElementById('new-item');
    const deleteCheckedButton = document.getElementById('delete-checked');
    const display = document.querySelector('.timer-display');
    const startButton = document.getElementById('start-timer');
    const resetButton = document.getElementById('reset-timer');
    const pomoTaskButton = document.getElementById('pomo-task'); 
    const pomoBreakButton = document.getElementById('pomo-break');
    const audioContext = new(window.AudioContext || window.webkitAudioContext)();
    const themeToggle = document.getElementById('theme-toggle');

    // State variables
    let items = JSON.parse(localStorage.getItem('protab-items') || '[]');
    let timer = null;
    let timeLeft = 0;
    let alarmOscillator = null;
    let isLightMode = localStorage.getItem('protab-theme') === 'light';

    // Checklist functionality
    function saveItems() {
        localStorage.setItem('protab-items', JSON.stringify(items));
    }

    function createItemElement(text, checked) {
        const div = document.createElement('div');
        div.className = 'checklist-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        const span = document.createElement('span');
        span.textContent = text;
        if (checked) span.classList.add('checked');
        checkbox.addEventListener('change', function() {
            span.classList.toggle('checked', this.checked);
            const index = Array.from(container.children).indexOf(div);
            items[index].checked = this.checked;
            saveItems();
        });
        div.appendChild(checkbox);
        div.appendChild(span);
        return div;
    }

    function renderItems() {
        container.innerHTML = '';
        items.forEach(item => {
            container.appendChild(createItemElement(item.text, item.checked));
        });
    }
    newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && newItemInput.value.trim()) {
            items.push({
                text: newItemInput.value.trim(),
                checked: false
            });
            newItemInput.value = '';
            renderItems();
            saveItems();
        }
    });
    deleteCheckedButton.addEventListener('click', () => {
        items = items.filter(item => !item.checked);
        renderItems();
        saveItems();
    });
    // Timer functionality
    function updateDisplay(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        display.textContent = `${String(hours).padStart(2, '0')}:` + `${String(minutes).padStart(2, '0')}:` + `${String(secs).padStart(2, '0')}`;
    }

    function playAlarm() {
        if (alarmOscillator) return;
        alarmOscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        alarmOscillator.type = 'square';
        alarmOscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        alarmOscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        alarmOscillator.start();
        setTimeout(() => {
            alarmOscillator.stop();
            alarmOscillator = null;
        }, 2000);
    }

    function showNotification() {
        playAlarm();
        if (Notification.permission === "granted") {
            new Notification("Time's up!", {
                body: "Your timer has completed!",
                icon: "icon.png"
            });
        } else {
            alert("Time's up!");
        }
    }

    function startTimer() {
        // Clear existing timer
        clearInterval(timer);
        // Get fresh input values
        const hours = parseInt(document.getElementById('hours').value) || 0;
        const minutes = parseInt(document.getElementById('minutes').value) || 0;
        const seconds = parseInt(document.getElementById('seconds').value) || 0;
        timeLeft = hours * 3600 + minutes * 60 + seconds;
        if (timeLeft <= 0) {
            alert('Please enter a valid time (at least 1 second)');
            return;
        }
        // Update button state
        startButton.textContent = 'Pause';
        startButton.removeEventListener('click', startTimer);
        startButton.addEventListener('click', pauseTimer);
        // Start countdown
        timer = setInterval(() => {
            timeLeft--;
            updateDisplay(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timer);
                showNotification();
                resetTimerState();
            }
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timer);
        startButton.textContent = 'Resume';
        startButton.removeEventListener('click', pauseTimer);
        startButton.addEventListener('click', startTimer);
    }

    function resetTimerState() {
        startButton.textContent = 'Start';
        startButton.removeEventListener('click', pauseTimer);
        startButton.addEventListener('click', startTimer);
        document.body.style.backgroundColor = '#000';
    }
    resetButton.addEventListener('click', () => {
        clearInterval(timer);
        document.getElementById('hours').value = '';
        document.getElementById('minutes').value = '';
        document.getElementById('seconds').value = '';
        updateDisplay(0);
        resetTimerState();
    });

    function fetchQuote() {
        fetch('https://meowfacts.herokuapp.com/').then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        }).then(data => {
            if (data.data && data.data.length > 0) {
                const fact = data.data[0];
                document.getElementById('quote-container').textContent = fact;
            }
        }).catch(error => {
            console.error('Error fetching cat fact:', error);
            document.getElementById('quote-container').textContent = 'Failed to fetch a cat fact. Keep purring!';
        });
    }

    function updateTheme() {
        document.body.classList.toggle('light-mode', isLightMode);
        themeToggle.textContent = isLightMode ? '🌙' : '☀️';
        localStorage.setItem('protab-theme', isLightMode ? 'light' : 'dark');
    }
    themeToggle.addEventListener('click', () => {
        isLightMode = !isLightMode;
        updateTheme();
    });

    function setPomoTime(minutes) {
        timeLeft = minutes * 60; 
        updateDisplay(timeLeft);  

        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            updateDisplay(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timer);
                showNotification();
                resetTimerState();
            }
        }, 1000);
        startButton.textContent = 'Pause';
        startButton.removeEventListener('click', startTimer);
        startButton.addEventListener('click', pauseTimer);
    }
    
    // Initial setup
    startButton.addEventListener('click', startTimer); 
    pomoTaskButton.addEventListener('click', () => setPomoTime(25));
    pomoBreakButton.addEventListener('click', () => setPomoTime(5));

    renderItems();
    updateDisplay(0);
    fetchQuote();
    updateTheme();
});

// Notification permission
document.addEventListener('click', function requestPermission() {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    document.removeEventListener('click', requestPermission);
}, {
    once: true
});