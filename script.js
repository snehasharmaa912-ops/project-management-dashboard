class ProjectDashboard {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [
            {
                id: 1,
                title: "Design database schema",
                description: "Create ER diagram for e-commerce platform",
                priority: "high",
                dueDate: "2025-12-28",
                status: "todo",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "User authentication",
                description: "JWT login with role-based access",
                priority: "high",
                status: "in-progress",
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: "Unit tests",
                description: "Jest coverage >85% for core logic",
                priority: "medium",
                status: "done",
                createdAt: new Date().toISOString()
            }
        ];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.isDarkMode = localStorage.getItem('dark-mode') === 'true';
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        if (this.isDarkMode) {
            document.body.classList.add('dark');
            document.getElementById('dark-toggle').classList.add('active');
        }
    }

    bindEvents() {
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.toLowerCase();
                this.render();
            }, 300);
        });
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.filter-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.render();
            });
        });
        document.getElementById('dark-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });
        document.getElementById('task-form').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openModal(null, btn.dataset.status || 'todo');
            });
        });
        document.querySelectorAll('.tasks-dropzone').forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
            zone.addEventListener('dragleave', this.handleDragLeave);
        });
    }

    handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const editingId = document.getElementById('task-modal').dataset.editing;
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate') || '',
            status: document.getElementById('task-modal').dataset.status || 'todo'
        };

        if (editingId) {
            const task = this.tasks.find(t => t.id == editingId);
            Object.assign(task, taskData);
        } else {
            taskData.id = Date.now();
            taskData.createdAt = new Date().toISOString();
            this.tasks.push(taskData);
        }

        this.saveTasks();
        this.render();
        this.closeModal();
        e.target.reset();
    }

    openModal(taskId, status = 'todo') {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const titleEl = document.getElementById('modal-title');
        
        modal.dataset.status = status;
        modal.dataset.editing = taskId || '';

        if (taskId) {
            const task = this.tasks.find(t => t.id == taskId);
            titleEl.textContent = 'Edit Task';
            form.title.value = task.title;
            form.description.value = task.description;
            form.priority.value = task.priority;
            if (task.dueDate) form.dueDate.value = task.dueDate;
        } else {
            titleEl.textContent = 'Add New Task';
            form.reset();
        }

        modal.showModal();
        form.title.focus();
    }

    closeModal() {
        document.getElementById('task-modal').close();
        document.getElementById('task-modal').dataset.editing = '';
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const taskId = parseInt(e.dataTransfer.getData('text/plain'));
        const newStatus = e.currentTarget.dataset.dropzone;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            task.status = newStatus;
            this.saveTasks();
            this.render();
        }
    }

    matchesFilter(task) {
        const now = new Date();
        const taskDate = task.dueDate ? new Date(task.dueDate) : null;

        switch (this.currentFilter) {
            case 'today':
                return taskDate && taskDate.toDateString() === now.toDateString();
            case 'overdue':
                return taskDate && taskDate < now && task.status !== 'done';
            case 'high':
                return task.priority === 'high';
            default:
                return true;
        }
    }

    matchesSearch(task) {
        return !this.searchQuery || 
               task.title.toLowerCase().includes(this.searchQuery) ||
               (task.description && task.description.toLowerCase().includes(this.searchQuery));
    }

    render() {
        const filteredTasks = this.tasks.filter(task => 
            this.matchesFilter(task) && this.matchesSearch(task)
        );
        ['todo', 'in-progress', 'done'].forEach(status => {
            const zone = document.querySelector(`[data-dropzone="${status}"]`);
            if (zone) {
                zone.innerHTML = '';
                filteredTasks
                    .filter(t => t.status === status)
                    .forEach(task => {
                        const taskEl = this.createTaskElement(task);
                        zone.appendChild(taskEl);
                    });
            }
        });
        document.getElementById('todo-count').textContent = 
            filteredTasks.filter(t => t.status === 'todo').length;
        document.getElementById('in-progress-count').textContent = 
            filteredTasks.filter(t => t.status === 'in-progress').length;
        document.getElementById('done-count').textContent = 
            filteredTasks.filter(t => t.status === 'done').length;
        document.getElementById('project-count').textContent = 
            `${this.tasks.length} tasks`;

        this.updateProgressChart(filteredTasks);
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task ${task.priority}`;
        div.draggable = true;
        div.dataset.taskId = task.id;
        
        div.addEventListener('dragstart', this.handleDragStart.bind(this));
        div.addEventListener('dblclick', () => this.openModal(task.id));

        const now = new Date();
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < now && task.status !== 'done';

        div.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <div class="priority-badge ${task.priority}">${task.priority.toUpperCase()}</div>
                </div>
                ${dueDate ? `<div class="task-meta">
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        ${dueDate.toLocaleDateString()}
                    </span>
                </div>` : ''}
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        `;

        return div;
    }

    updateProgressChart(tasks) {
        const canvas = document.getElementById('progress-chart');
        const ctx = canvas.getContext('2d');
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'done').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.arc(50, 50, 42, 0, 2 * Math.PI);
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();
        const angle = (percentage / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(50, 50, 42, -Math.PI / 2, angle - Math.PI / 2);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineCap = 'round';
        ctx.lineWidth = 8;
        ctx.stroke();

        document.getElementById('progress-text').textContent = `${percentage}%`;
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark', this.isDarkMode);
        localStorage.setItem('dark-mode', this.isDarkMode);
        document.getElementById('dark-toggle').classList.toggle('active', this.isDarkMode);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new ProjectDashboard();
});
