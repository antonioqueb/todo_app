/** @odoo-module **/
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart, onMounted } from "@odoo/owl";
import { loadJS } from "@web/core/assets"; // Importante para cargar librerías core

export class TodoDashboard extends Component {
    static template = "todo_app.Dashboard";

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");
        
        this.state = useState({
            total: 0,
            done: 0,
            pending: 0,
            by_priority: { alta: 0, media: 0, baja: 0 },
            completion_rate: 0,
            loading: true,
        });

        onWillStart(async () => {
            // Cargamos la librería Chart.js que Odoo ya tiene internamente
            await loadJS("/web/static/lib/chartjs/chart.js");
            await this.loadDashboardData();
        });

        onMounted(() => {
            this.renderChart();
        });
    }

    async loadDashboardData() {
        try {
            const data = await this.orm.call("todo.task", "get_dashboard_data", []);
            Object.assign(this.state, data, { loading: false });
        } catch (error) {
            console.error("Error cargando datos:", error);
            this.state.loading = false;
        }
    }

    renderChart() {
        const canvas = document.getElementById('priorityChart');
        if (!canvas) return;
        
        if (this.chart) {
            this.chart.destroy();
        }

        // Ahora 'Chart' ya está definido porque esperamos a loadJS
        this.chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Alta', 'Media', 'Baja'],
                datasets: [{
                    data: [
                        this.state.by_priority.alta,
                        this.state.by_priority.media,
                        this.state.by_priority.baja
                    ],
                    backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    openTasks(domain = []) {
        this.action.doAction({
            type: 'ir.actions.act_window',
            name: 'Tareas',
            res_model: 'todo.task',
            view_mode: 'list,form',
            views: [[false, 'list'], [false, 'form']],
            domain: domain,
            target: 'current',
        });
    }

    async createQuickTask() {
        const name = prompt("Nombre de la nueva tarea:");
        if (name) {
            await this.orm.create("todo.task", [{ name, priority: '1' }]);
            await this.refresh();
        }
    }

    async refresh() {
        this.state.loading = true;
        await this.loadDashboardData();
        this.renderChart();
    }

    celebrate() {
        this.notification.add("🎉 ¡Excelente trabajo!", { type: "success" });
        this.launchConfetti();
    }

    launchConfetti() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        let particles = Array.from({ length: 100 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 2,
            color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'][Math.floor(Math.random() * 4)],
            v: Math.random() * 3 + 2
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                p.y += p.v;
                if (p.y > canvas.height) p.y = -10;
            });
            this.confettiAnim = requestAnimationFrame(draw);
        };
        draw();
        setTimeout(() => {
            cancelAnimationFrame(this.confettiAnim);
            canvas.remove();
        }, 4000);
    }
}

registry.category("actions").add("todo_dashboard_action", TodoDashboard);