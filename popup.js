document.addEventListener('DOMContentLoaded', function() {
  // Tab Handling
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
      tab.addEventListener('click', () => {
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Hide all content
          document.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
          });
          // Show selected content
          document.getElementById(tab.dataset.tab).classList.add('active');
      });
  });

  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  
  // Load saved theme
  chrome.storage.local.get(['theme'], function(result) {
      if (result.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
          themeToggle.checked = true;
      } else {
          document.documentElement.setAttribute('data-theme', 'light');
          themeToggle.checked = false;
      }
  });

  themeToggle.addEventListener('change', function() {
      const newTheme = this.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      chrome.storage.local.set({ 'theme': newTheme });
  });

  // Load existing notes
  loadNotes();
  
  // Add save button listener
  const saveButton = document.getElementById('save-notes');
  if (saveButton) {
      saveButton.addEventListener('click', saveNotes);
  }

  // Tasks Functionality
  loadTasks();
  const addTaskButton = document.getElementById('add-task');
  const taskInput = document.getElementById('task-input');

  if (addTaskButton && taskInput) {
      addTaskButton.addEventListener('click', addTask);
      taskInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
              addTask();
          }
      });
  }

  // Timer Functionality - Updated Version
  const timerDisplay = document.getElementById('timer-display');
  const startTimerButton = document.getElementById('start-timer');
  const resetTimerButton = document.getElementById('reset-timer');
  const presetButtons = document.querySelectorAll('.timer-preset');
  const customMinutesInput = document.getElementById('custom-minutes');
  const setCustomTimeButton = document.getElementById('set-custom-time');
  
  let timeLeft = 25 * 60;
  let timerInterval = null;
  let selectedPreset = 1500;
  const timerSound = new Audio('timer-sound.wav');

  // Function to save timer state
  function saveTimerState(timeRemaining, isRunning) {
      const state = {
          timeLeft: timeRemaining,
          endTime: isRunning ? Date.now() + (timeRemaining * 1000) : null,
          isRunning: isRunning,
          originalTime: selectedPreset
      };
      chrome.storage.local.set({ timerState: state });
      return state;
  }

  // Function to load timer state
  function loadTimerState() {
      chrome.storage.local.get(['timerState'], function(result) {
          if (result.timerState) {
              if (result.timerState.isRunning && result.timerState.endTime) {
                  const currentTime = Date.now();
                  const endTime = result.timerState.endTime;
                  if (endTime > currentTime) {
                      timeLeft = Math.ceil((endTime - currentTime) / 1000);
                      updateTimerDisplay();
                      startTimer(true); // true means resuming
                  }
              } else {
                  timeLeft = result.timerState.timeLeft;
                  updateTimerDisplay();
              }
          }
      });
  }

  function startTimer(isResuming = false) {
      if (timerInterval === null) {
          if (startTimerButton) {
              startTimerButton.textContent = 'Pause';
          }
          
          if (!isResuming) {
              saveTimerState(timeLeft, true);
          }
          
          timerInterval = setInterval(() => {
              timeLeft--;
              updateTimerDisplay();
              
              if (timeLeft <= 0) {
                  clearInterval(timerInterval);
                  timerInterval = null;
                  if (startTimerButton) {
                      startTimerButton.textContent = 'Start';
                  }
                  saveTimerState(selectedPreset, false);
                  showMessage('Time is up!');
                  timerSound.play()
                      .then(() => console.log('Sound played successfully'))
                      .catch(error => console.log('Sound play failed:', error));
                  chrome.runtime.sendMessage({ action: 'playSound' });
              }
          }, 1000);
      }
  }

  function stopTimer() {
      if (timerInterval !== null) {
          clearInterval(timerInterval);
          timerInterval = null;
          if (startTimerButton) {
              startTimerButton.textContent = 'Start';
          }
          saveTimerState(timeLeft, false);
      }
  }

  function updateTimerDisplay() {
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
          const hours = Math.floor(timeLeft / 3600);
          const minutes = Math.floor((timeLeft % 3600) / 60);
          const seconds = timeLeft % 60;
          
          if (hours > 0) {
              timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          } else {
              timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
      }
  }

  // Update the start timer click handler
  if (startTimerButton) {
      startTimerButton.addEventListener('click', function() {
          if (timerInterval === null) {
              startTimer();
          } else {
              stopTimer();
          }
      });
  }

  // Reset button handler
  if (resetTimerButton) {
      resetTimerButton.addEventListener('click', function() {
          stopTimer();
          timeLeft = selectedPreset;
          updateTimerDisplay();
          saveTimerState(timeLeft, false);
      });
  }

  // Preset button handlers
  if (presetButtons) {
      presetButtons.forEach(button => {
          button.addEventListener('click', () => {
              const time = parseInt(button.dataset.time);
              if (!isNaN(time)) {
                  selectedPreset = time;
                  timeLeft = time;
                  updateTimerDisplay();
                  if (timerInterval !== null) {
                      stopTimer();
                  }
                  saveTimerState(timeLeft, false);
              }
          });
      });
  }

  // Initialize timer display
  updateTimerDisplay();

  // Update the custom timer setup
  if (setCustomTimeButton) {
      setCustomTimeButton.addEventListener('click', () => {
          const hours = parseInt(document.getElementById('custom-hours').value) || 0;
          const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
          const seconds = parseInt(document.getElementById('custom-seconds').value) || 0;

          // Validate input
          if (hours < 0 || hours > 6 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
              showMessage('Please enter valid time values');
              return;
          }

          // Check if at least one value is entered
          if (hours === 0 && minutes === 0 && seconds === 0) {
              showMessage('Please enter at least one time value');
              return;
          }

          // Convert to total seconds
          const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
          
          // Update timer
          selectedPreset = totalSeconds;
          timeLeft = totalSeconds;
          updateTimerDisplay();
          
          if (timerInterval !== null) {
              clearInterval(timerInterval);
              timerInterval = null;
              if (startTimerButton) {
                  startTimerButton.textContent = 'Start';
              }
          }
          
          // Clear inputs
          document.getElementById('custom-hours').value = '';
          document.getElementById('custom-minutes').value = '';
          document.getElementById('custom-seconds').value = '';
          
          showMessage(`Timer set to ${hours}h ${minutes}m ${seconds}s`);
      });
  }

  // Load timer state when popup opens
  loadTimerState();
});

// Notes Functions
function loadNotes() {
  console.log('Loading notes...');
  chrome.storage.local.get(['allNotes'], function(result) {
      console.log('Retrieved notes:', result.allNotes);
      
      const savedNotesList = document.getElementById('saved-notes-list');
      
      if (savedNotesList) {
          savedNotesList.innerHTML = '';
          
          // Get notes and reverse the array to show newest first
          const allNotes = (result.allNotes || []).reverse();
          
          if (allNotes.length === 0) {
              savedNotesList.innerHTML = '<p style="color: var(--text-color);">No saved notes yet.</p>';
          } else {
              allNotes.forEach((note, index) => {
                  const noteElement = document.createElement('div');
                  noteElement.className = 'saved-note';
                  noteElement.style.cssText = `
                      padding: 10px;
                      margin: 10px 0;
                      background-color: var(--task-bg);
                      border-radius: 4px;
                      border: 1px solid var(--border-color);
                  `;
                  
                  const createdDate = new Date(note.createdAt).toLocaleString();
                  
                  noteElement.innerHTML = `
                      <div style="margin-bottom: 8px; color: var(--text-color);">${note.content}</div>
                      <div style="font-size: 11px; color: var(--text-color); margin-bottom: 8px;">
                          Created: ${createdDate}
                      </div>
                      <div style="display: flex; gap: 5px;">
                          <button class="load-btn" style="flex: 1; padding: 4px 8px; background-color: #4CAF50;">Load</button>
                          <button class="delete-btn" style="flex: 1; padding: 4px 8px; background-color: #ff4444;">Delete</button>
                      </div>
                  `;
                  
                  // Add event listeners for load and delete
                  const loadBtn = noteElement.querySelector('.load-btn');
                  const deleteBtn = noteElement.querySelector('.delete-btn');
                  
                  loadBtn.addEventListener('click', () => {
                      // We need to use the reverse index since we reversed the array
                      loadNoteContent(allNotes.length - 1 - index);
                  });
                  
                  deleteBtn.addEventListener('click', () => {
                      // We need to use the reverse index since we reversed the array
                      deleteNote(allNotes.length - 1 - index);
                  });
                  
                  savedNotesList.appendChild(noteElement);
              });
          }
      }
  });
}

function loadNoteContent(index) {
  console.log('Loading note at index:', index);
  chrome.storage.local.get(['allNotes'], function(result) {
      const allNotes = result.allNotes || [];
      const note = allNotes[index];
      
      if (note) {
          const notesText = document.getElementById('notes-text');
          if (notesText) {
              notesText.value = note.content;
              showMessage('Note loaded!');
          }
      }
  });
}

function deleteNote(index) {
  console.log('Deleting note at index:', index);
  chrome.storage.local.get(['allNotes'], function(result) {
      const allNotes = result.allNotes || [];
      allNotes.splice(index, 1);
      
      chrome.storage.local.set({
          'allNotes': allNotes
      }, function() {
          showMessage('Note deleted!');
          loadNotes(); // Refresh the notes list
      });
  });
}

function saveNotes() {
  const notesText = document.getElementById('notes-text');
  if (!notesText) return;

  const content = notesText.value.trim();
  if (!content) {
      showMessage('Please enter some text to save');
      return;
  }

  chrome.storage.local.get(['allNotes'], function(result) {
      const allNotes = result.allNotes || [];
      const currentTime = new Date().getTime();
      
      const newNote = {
          content: content,
          createdAt: currentTime,
          modifiedAt: currentTime
      };
      
      allNotes.push(newNote);
      
      chrome.storage.local.set({
          'allNotes': allNotes
      }, function() {
          console.log('Note saved:', newNote);
          showMessage('Note saved successfully!');
          loadNotes(); // Refresh the notes list
      });
  });
}

// Tasks Functions
function loadTasks() {
    chrome.storage.local.get(['tasks'], function(result) {
        const taskList = document.getElementById('task-list');
        if (!taskList) return;
        
        taskList.innerHTML = '';
        const tasks = result.tasks || [];
        
        tasks.forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.draggable = true;
            taskElement.dataset.index = index;
            
            // Simplified, clean HTML structure
            taskElement.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span>${task.text}</span>
                <button class="delete-task" aria-label="Delete"></button>
            `;
            
            // Add event listeners
            taskElement.addEventListener('dragstart', handleDragStart);
            taskElement.addEventListener('dragover', handleDragOver);
            taskElement.addEventListener('drop', handleDrop);
            taskElement.addEventListener('dragenter', handleDragEnter);
            taskElement.addEventListener('dragleave', handleDragLeave);
            
            const checkbox = taskElement.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function() {
                toggleTaskComplete(index, this.checked);
                taskElement.classList.toggle('completed', this.checked);
            });
            
            const deleteBtn = taskElement.querySelector('.delete-task');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                taskElement.style.transform = 'translateX(100%)';
                taskElement.style.opacity = '0';
                setTimeout(() => deleteTask(index), 200);
            });
            
            taskList.appendChild(taskElement);
        });
    });
}

// Drag and drop handler functions
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItem === this) return;
    
    this.classList.remove('drag-over');
    
    // Get the indices
    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);
    
    // Reorder tasks in storage
    chrome.storage.local.get(['tasks'], function(result) {
        const tasks = result.tasks || [];
        const [movedTask] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, movedTask);
        
        chrome.storage.local.set({ 'tasks': tasks }, function() {
            loadTasks(); // Reload tasks after reordering
        });
    });
}

function addTask() {
    const taskInput = document.getElementById('task-input');
    const taskText = taskInput.value.trim();
    
    if (taskText) {
        chrome.storage.local.get(['tasks'], function(result) {
            const tasks = result.tasks || [];
            tasks.push({
                text: taskText,
                completed: false
            });
            
            chrome.storage.local.set({
                'tasks': tasks
            }, function() {
                taskInput.value = '';
                loadTasks();
                showMessage('Task added!');
            });
        });
    }
}

function toggleTaskComplete(index, completed) {
  chrome.storage.local.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      if (tasks[index]) {
          tasks[index].completed = completed;
          chrome.storage.local.set({
              'tasks': tasks
          }, function() {
              // No need to reload entire list, we already updated the UI
              showMessage(completed ? 'Task completed!' : 'Task uncompleted');
          });
      }
  });
}

function deleteTask(index) {
  chrome.storage.local.get(['tasks'], function(result) {
      const tasks = result.tasks || [];
      tasks.splice(index, 1);
      chrome.storage.local.set({
          'tasks': tasks
      }, function() {
          showMessage('Task deleted!');
          loadTasks();
      });
  });
}

function showMessage(message) {
  const div = document.createElement('div');
  div.textContent = message;
  div.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}