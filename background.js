let timer = {
    endTime: null,
    intervalId: null
};

// Create audio element
let timerSound = new Audio('timer-sound.wav');
let checkInterval = null;

// Create audio context when needed to work around autoplay restrictions
function playAlertSound() {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    
    // Play sound for 1 second
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
    
    // Clean up
    setTimeout(() => {
        oscillator.disconnect();
        gainNode.disconnect();
    }, 1000);
}

function checkAndUpdateTimer() {
    chrome.storage.local.get(['timerState'], function(result) {
        if (result.timerState && result.timerState.isRunning) {
            const currentTime = Date.now();
            const endTime = result.timerState.endTime;
            
            if (endTime && endTime <= currentTime) {
                // Timer completed
                playAlertSound();
                
                // Show Chrome notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon48.png',  // Make sure you have this icon
                    title: 'Timer Complete!',
                    message: 'Your timer has finished!',
                    priority: 2
                });
                
                // Update timer state
                chrome.storage.local.set({
                    timerState: {
                        timeLeft: result.timerState.originalTime,
                        endTime: null,
                        isRunning: false,
                        originalTime: result.timerState.originalTime
                    }
                });
            }
        }
    });
}

// Start checking when extension loads
if (checkInterval) {
    clearInterval(checkInterval);
}
checkInterval = setInterval(checkAndUpdateTimer, 1000);

// Listen for timer start
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTimer') {
        timer.endTime = Date.now() + (message.duration * 1000);
        
        // Clear any existing interval
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
        }
        
        // Start checking the timer
        timer.intervalId = setInterval(() => {
            const remaining = Math.round((timer.endTime - Date.now()) / 1000);
            
            if (remaining <= 0) {
                clearInterval(timer.intervalId);
                timer.intervalId = null;
                // Play sound in background
                timerSound.play()
                    .then(() => console.log('Sound played successfully'))
                    .catch(error => console.log('Sound play failed:', error));
                chrome.runtime.sendMessage({ action: 'timerComplete' });
            } else {
                chrome.runtime.sendMessage({ 
                    action: 'timerUpdate', 
                    timeLeft: remaining 
                });
            }
        }, 1000);
    }
    
    if (message.action === 'stopTimer') {
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
    }
    
    if (message.action === 'getTimeLeft') {
        if (timer.endTime) {
            const remaining = Math.round((timer.endTime - Date.now()) / 1000);
            sendResponse({ timeLeft: remaining > 0 ? remaining : 0 });
        } else {
            sendResponse({ timeLeft: 0 });
        }
        return true;
    }

    if (message.action === 'playSound') {
        playAlertSound();
    }
});

// Check timer state periodically
setInterval(() => {
    chrome.storage.local.get(['timerState'], function(result) {
        if (result.timerState && result.timerState.isRunning) {
            const currentTime = Date.now();
            const endTime = result.timerState.endTime;
            
            if (endTime && endTime <= currentTime) {
                // Timer completed
                chrome.storage.local.set({
                    timerState: {
                        timeLeft: result.timerState.originalTime || 1500,
                        endTime: null,
                        isRunning: false
                    }
                });
                
                // Play sound
                timerSound.play()
                    .then(() => console.log('Sound played successfully'))
                    .catch(error => console.log('Sound play failed:', error));
            }
        }
    });
}, 1000); 