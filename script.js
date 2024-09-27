document.getElementById('algorithm').addEventListener('change', function() {
    const selectedAlgorithm = document.getElementById('algorithm').value;
    const quantumField = document.getElementById('quantumField');
    const priorityField = document.getElementById('priorityField');

    // Show/Hide fields based on the selected algorithm
    if (selectedAlgorithm === 'round-robin') {
        quantumField.classList.remove('hidden');
        priorityField.classList.add('hidden');
    } else if (selectedAlgorithm === 'priority') {
        quantumField.classList.add('hidden');
        priorityField.classList.remove('hidden');
    } else {
        quantumField.classList.add('hidden');
        priorityField.classList.add('hidden');
    }
});

document.getElementById('inputForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const numProcesses = parseInt(document.getElementById('processes').value);
    const arrivalTimes = document.getElementById('arrivalTimes').value.split(',').map(Number);
    const burstTimes = document.getElementById('burstTimes').value.split(',').map(Number);
    const algorithm = document.getElementById('algorithm').value;
    let quantum = null;
    let priorities = null;

    if (algorithm === 'round-robin') {
        quantum = parseInt(document.getElementById('quantum').value);
        if (isNaN(quantum) || quantum <= 0) {
            alert('Please enter a valid quantum time.');
            return;
        }
    }

    if (algorithm === 'priority') {
        priorities = document.getElementById('priority').value.split(',').map(Number);
        if (priorities.length !== numProcesses) {
            alert('Number of priorities should match the number of processes.');
            return;
        }
    }

    // Clear previous results
    document.getElementById('ganttChart').innerHTML = '';
    document.getElementById('results').innerHTML = '';

    if (arrivalTimes.length !== numProcesses || burstTimes.length !== numProcesses) {
        alert('Number of arrival and burst times should match the number of processes.');
        return;
    }

    // Create process objects
    let processes = [];
    for (let i = 0; i < numProcesses; i++) {
        processes.push({ id: i + 1, arrival: arrivalTimes[i], burst: burstTimes[i], priority: priorities ? priorities[i] : null });
    }

    // Scheduling Algorithms
    let ganttChart = [];
    let waitingTimes = [];
    let turnaroundTimes = [];

    switch (algorithm) {
        case 'fcfs':
            ganttChart = calculateFCFS(processes);
            break;
        case 'sjf':
            ganttChart = calculateSJF(processes, false); // Non-preemptive SJF
            break;
        case 'sjf-preemptive':
            ganttChart = calculateSJF(processes, true); // Preemptive SJF
            break;
        case 'round-robin':
            ganttChart = calculateRoundRobin(processes, quantum);
            break;
        case 'priority':
            ganttChart = calculatePriority(processes);
            break;
        default:
            break;
    }

    // Display Gantt chart
    function displayGanttChart(ganttChart) {
        ganttChart.forEach(block => {
            const processBar = document.createElement('div');
            processBar.className = 'process-bar';
            processBar.innerText = `P${block.processId}: ${block.start} - ${block.end}`;
            document.getElementById('ganttChart').appendChild(processBar);
        });
    }

    // Display results
    function displayResults(waitingTimes, turnaroundTimes) {
        const avgWaitingTime = waitingTimes.reduce((a, b) => a + b, 0) / numProcesses;
        const avgTurnaroundTime = turnaroundTimes.reduce((a, b) => a + b, 0) / numProcesses;

        document.getElementById('results').innerHTML = `
            <p>Average Waiting Time: ${avgWaitingTime.toFixed(2)}</p>
            <p>Average Turnaround Time: ${avgTurnaroundTime.toFixed(2)}</p>
        `;
    }

    // FCFS Scheduling
    function calculateFCFS(processes) {
        let currentTime = 0;
        let waitingTimes = [];
        let turnaroundTimes = [];
        const ganttChart = [];

        processes.sort((a, b) => a.arrival - b.arrival); // Sort by arrival time

        processes.forEach(process => {
            if (currentTime < process.arrival) {
                currentTime = process.arrival;
            }
            const startTime = currentTime;
            const endTime = startTime + process.burst;
            ganttChart.push({ processId: process.id, start: startTime, end: endTime });

            const waitingTime = startTime - process.arrival;
            waitingTimes.push(waitingTime);
            turnaroundTimes.push(waitingTime + process.burst);

            currentTime = endTime;
        });

        displayGanttChart(ganttChart);
        displayResults(waitingTimes, turnaroundTimes);
        return ganttChart;
    }

    // Non-preemptive and Preemptive SJF Scheduling
    function calculateSJF(processes, isPreemptive) {
        let currentTime = 0;
        const ganttChart = [];
        let waitingTimes = Array(processes.length).fill(0);
        let turnaroundTimes = [];
        let remainingBurst = processes.map(p => p.burst);
        const isCompleted = Array(processes.length).fill(false);
        let completed = 0;

        while (completed < processes.length) {
            // Get the available processes that have arrived
            const availableProcesses = processes
                .map((process, index) => ({ ...process, index }))
                .filter(process => process.arrival <= currentTime && !isCompleted[process.index]);

            if (availableProcesses.length === 0) {
                currentTime++;
                continue;
            }

            // Select process with the shortest burst time
            const selectedProcess = availableProcesses.reduce((prev, curr) => (remainingBurst[prev.index] < remainingBurst[curr.index] ? prev : curr));

            const processIndex = selectedProcess.index;

            if (isPreemptive) {
                ganttChart.push({ processId: selectedProcess.id, start: currentTime, end: currentTime + 1 });
                remainingBurst[processIndex]--;
                currentTime++;
                if (remainingBurst[processIndex] === 0) {
                    isCompleted[processIndex] = true;
                    completed++;
                    const completionTime = currentTime;
                    waitingTimes[processIndex] = completionTime - processes[processIndex].arrival - processes[processIndex].burst;
                    turnaroundTimes.push(completionTime - processes[processIndex].arrival);
                }
            } else {
                ganttChart.push({ processId: selectedProcess.id, start: currentTime, end: currentTime + selectedProcess.burst });
                currentTime += selectedProcess.burst;
                isCompleted[processIndex] = true;
                completed++;
                const completionTime = currentTime;
                waitingTimes[processIndex] = completionTime - processes[processIndex].arrival - processes[processIndex].burst;
                turnaroundTimes.push(completionTime - processes[processIndex].arrival);
            }
        }

        displayGanttChart(ganttChart);
        displayResults(waitingTimes, turnaroundTimes);
        return ganttChart;
    }

    // Round Robin Scheduling
    function calculateRoundRobin(processes, quantum) {
        let currentTime = 0;
        const ganttChart = [];
        let waitingTimes = Array(processes.length).fill(0);
        let turnaroundTimes = [];
        let remainingBurst = processes.map(p => p.burst);
        let queue = [];
        let completed = 0;

        // Track the completion status of processes
        const isCompleted = Array(processes.length).fill(false);

        // Continue until all processes are completed
        while (completed < processes.length) {
            // Add newly arrived processes to the queue
            for (let i = 0; i < processes.length; i++) {
                if (processes[i].arrival <= currentTime && remainingBurst[i] > 0 && !queue.includes(i)) {
                    queue.push(i);
                }
            }

            // If the queue is empty, advance time
            if (queue.length === 0) {
                currentTime++;
                continue;
            }

            // Get the next process to execute
            const processIndex = queue.shift(); // Dequeue the next process
            const executionTime = Math.min(quantum, remainingBurst[processIndex]);

            // Record the Gantt chart entry
            ganttChart.push({ processId: processes[processIndex].id, start: currentTime, end: currentTime + executionTime });
            
            // Update remaining burst time and current time
            remainingBurst[processIndex] -= executionTime;
            currentTime += executionTime;

            // If the process is finished
            if (remainingBurst[processIndex] === 0) {
                completed++;
                isCompleted[processIndex] = true;

                // Calculate waiting time and turnaround time
                const completionTime = currentTime;
                waitingTimes[processIndex] = completionTime - processes[processIndex].arrival - processes[processIndex].burst;
                turnaroundTimes.push(completionTime - processes[processIndex].arrival);
            } else {
                // If the process is not finished, re-add it to the queue
                queue.push(processIndex);
            }
        }

        // Display Gantt Chart and Results
        displayGanttChart(ganttChart);
        displayResults(waitingTimes, turnaroundTimes);
        return ganttChart;
    }

    // Priority Scheduling (Non-preemptive)
    function calculatePriority(processes) {
        let currentTime = 0;
        const ganttChart = [];
        let waitingTimes = [];
        let turnaroundTimes = [];
        const isCompleted = Array(processes.length).fill(false);
        let completed = 0;

        while (completed < processes.length) {
            // Get available processes
            const availableProcesses = processes
                .map((process, index) => ({ ...process, index }))
                .filter(process => process.arrival <= currentTime && !isCompleted[process.index]);

            if (availableProcesses.length === 0) {
                currentTime++;
                continue;
            }

            // Select process with the highest priority (lower number = higher priority)
            const selectedProcess = availableProcesses.reduce((prev, curr) => (prev.priority < curr.priority ? prev : curr));
            const processIndex = selectedProcess.index;

            ganttChart.push({ processId: selectedProcess.id, start: currentTime, end: currentTime + selectedProcess.burst });
            currentTime += selectedProcess.burst;
            isCompleted[processIndex] = true;
            completed++;

            const completionTime = currentTime;
            waitingTimes[processIndex] = completionTime - processes[processIndex].arrival - processes[processIndex].burst;
            turnaroundTimes.push(completionTime - processes[processIndex].arrival);
        }

        displayGanttChart(ganttChart);
        displayResults(waitingTimes, turnaroundTimes);
        return ganttChart;
    }
});