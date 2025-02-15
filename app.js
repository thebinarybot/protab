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
    let bookmarks = JSON.parse(localStorage.getItem('protab-bookmarks') || '[]');
    let notes = JSON.parse(localStorage.getItem('protab-notes') || '[{"id":1,"title":"Quick Note","content":""}]');

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
        span.setAttribute('contenteditable', 'true');
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => {
            const index = Array.from(container.children).indexOf(div);
            items.splice(index, 1);
            div.remove();
            saveItems();
        });
    
        if (checked) span.classList.add('checked');
    
        span.addEventListener('blur', function() {
            const newText = this.textContent.trim();
            const index = Array.from(container.children).indexOf(div);
            
            if (newText && index !== -1) {
                items[index].text = newText;
                saveItems();
            } else if (!newText) {
                items.splice(index, 1);
                div.remove();
                saveItems();
            }
        });
    
        span.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                span.blur();
            }
        });
    
        checkbox.addEventListener('change', function() {
            span.classList.toggle('checked', this.checked);
            const index = Array.from(container.children).indexOf(div);
            items[index].checked = this.checked;
            saveItems();
        });
    
        div.appendChild(checkbox);
        div.appendChild(span);
        div.appendChild(deleteBtn); 
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
    
    function createBookmarkCard(url) {
        const card = document.createElement('div');
        card.className = 'bookmark-card';
        card.dataset.url = url; 
    
        try {
            const urlObj = new URL(url);
            card.textContent = urlObj.hostname;
            card.title = url;
        } catch {
            card.textContent = 'Invalid URL';
        }
    
        const controls = document.createElement('div');
        controls.className = 'bookmark-controls';
    
        const editBtn = document.createElement('button');
        editBtn.className = 'bookmark-edit';
        editBtn.innerHTML = '✏️';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newUrl = prompt('Edit website URL:', card.dataset.url);
            if (newUrl) {
                try {
                    new URL(newUrl); // Validate URL
                    const index = bookmarks.indexOf(card.dataset.url);
                    if (index > -1) {
                        bookmarks[index] = newUrl;
                        localStorage.setItem('protab-bookmarks', JSON.stringify(bookmarks));
                        renderBookmarks();
                    }
                } catch {
                    alert('Please enter a valid URL');
                }
            }
        });
    
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bookmark-delete';
        deleteBtn.innerHTML = '❌';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = bookmarks.indexOf(card.dataset.url);
            if (index > -1) {
                bookmarks.splice(index, 1);
                localStorage.setItem('protab-bookmarks', JSON.stringify(bookmarks));
                renderBookmarks();
            }
        });
    
        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        card.appendChild(controls);
    
        card.addEventListener('click', (e) => {
            if (e.target.closest('.bookmark-controls')) return;
            try {
                window.location.href = card.dataset.url;
            } catch {
                alert('Could not open URL');
            }
        });
    
        return card;
    }    
    
    function renderBookmarks() {
        const container = document.getElementById('bookmarks-container');
        container.innerHTML = '';
    
        bookmarks.slice(0, 5).forEach(url => {
            container.appendChild(createBookmarkCard(url));
        });
    
        if (bookmarks.length < 5) {
            const addCard = document.createElement('div');
            addCard.className = 'bookmark-card add-new';
            addCard.textContent = '+';
            addCard.addEventListener('click', () => {
                const url = prompt('Enter website URL (include http:// or https://):');
                if (url) {
                    try {
                        new URL(url);
                        bookmarks.push(url);
                        localStorage.setItem('protab-bookmarks', JSON.stringify(bookmarks));
                        renderBookmarks();
                    } catch {
                        alert('Please enter a valid URL');
                    }
                }
            });
            container.appendChild(addCard);
        }
    }

    function createNoteElement(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.id;
        
        const title = document.createElement('div');
        title.textContent = note.title || 'Untitled';
        card.appendChild(title);
        
        card.addEventListener('click', () => {
            openNoteModal(note);
        });
        
        return card;
    }
    
    function openNoteModal(note) {
        const modal = document.getElementById('note-modal');
        const modalContent = document.querySelector('.modal-content');
        const titleInput = document.getElementById('note-title');
        const bodyInput = document.getElementById('note-body');
        
        // Reset modal state
        titleInput.value = note.title || '';
        bodyInput.value = note.content || '';
        modal.style.display = 'flex';
    
        // Cleanup previous listeners
        const cleanUp = () => {
            modal.removeEventListener('click', handleOutsideClick);
            saveBtn.removeEventListener('click', saveHandler);
            deleteBtn.removeEventListener('click', deleteHandler);
        };
    
        // Handle outside click
        const handleOutsideClick = (e) => {
            if (!modalContent.contains(e.target)) {
                modal.style.display = 'none';
                cleanUp();
            }
        };
    
        // Save handler
        const saveHandler = () => {
            note.title = titleInput.value.trim();
            note.content = bodyInput.value.trim();
            localStorage.setItem('protab-notes', JSON.stringify(notes));
            renderNotes();
            modal.style.display = 'none';
            cleanUp();
        };
    
        // Delete handler
        const deleteHandler = () => {
            notes = notes.filter(n => n.id !== note.id);
            localStorage.setItem('protab-notes', JSON.stringify(notes));
            renderNotes();
            modal.style.display = 'none';
            cleanUp();
        };
    
        // Get fresh button references
        const saveBtn = document.getElementById('save-note');
        const deleteBtn = document.getElementById('delete-note');
    
        // Attach new listeners
        modal.addEventListener('click', handleOutsideClick);
        saveBtn.addEventListener('click', saveHandler);
        deleteBtn.addEventListener('click', deleteHandler);
    }
    
    function renderNotes() {
        const container = document.getElementById('notes-container');
        container.innerHTML = '';
        
        // First render all existing notes
        notes.forEach(note => {
            container.appendChild(createNoteElement(note));
        });
      
        // Then add the "+" card if less than 5 notes
        const addCard = document.createElement('div');
        addCard.className = 'note-card add-new';
        addCard.textContent = '+';
        addCard.addEventListener('click', () => {
            const newNote = {
                id: Date.now(),
                title: `Note ${notes.length + 1}`,
                content: ''
            };
            notes.push(newNote);
            localStorage.setItem('protab-notes', JSON.stringify(notes));
            renderNotes();
        });
        container.appendChild(addCard);
    }
    
    // Initialize notes array from localStorage without creating default note
    if (!localStorage.getItem('protab-notes')) {
        notes = [];
        localStorage.setItem('protab-notes', JSON.stringify(notes));
    }
    
    // Initial setup
    startButton.addEventListener('click', startTimer); 
    pomoTaskButton.addEventListener('click', () => setPomoTime(25));
    pomoBreakButton.addEventListener('click', () => setPomoTime(5));

    renderItems();
    updateDisplay(0);
    fetchQuote();
    updateTheme();
    renderBookmarks();
    renderNotes();
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