let timer = {
    endTime: null,
    intervalId: null,
    isRunning: false
};

self.onmessage = function(e) {
    if (e.data.action === 'startTimer') {
        timer.endTime = Date.now() + (e.data.duration * 1000);
        timer.isRunning = true;
        
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
        }
        
        timer.intervalId = setInterval(() => {
            const remaining = Math.round((timer.endTime - Date.now()) / 1000);
            
            if (remaining <= 0) {
                clearInterval(timer.intervalId);
                timer.intervalId = null;
                timer.isRunning = false;
                self.postMessage({ action: 'timerComplete' });
            } else {
                self.postMessage({ 
                    action: 'timerUpdate', 
                    timeLeft: remaining,
                    isRunning: timer.isRunning
                });
            }
        }, 1000);
    }
    
    if (e.data.action === 'stopTimer') {
        timer.isRunning = false;
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
    }

    if (e.data.action === 'getState') {
        if (timer.endTime && timer.isRunning) {
            const remaining = Math.round((timer.endTime - Date.now()) / 1000);
            self.postMessage({ 
                action: 'stateUpdate',
                timeLeft: remaining > 0 ? remaining : 0,
                isRunning: timer.isRunning
            });
        }
    }
}; 