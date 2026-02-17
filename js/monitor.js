const API_URL = "https://698a177dc04d974bc6a153aa.mockapi.io/api/v1/smart-gaming-iot";

let chart;
let labels = [];
let dataConsumo = [];

async function cargarMonitoreo() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        let consumoTotal = data.reduce((total, dispositivo) => {
            return total + Number(dispositivo.consumo || 0);
        }, 0);

        const ahora = new Date().toLocaleTimeString();

        labels.push(ahora);
        dataConsumo.push(consumoTotal);

        if (labels.length > 10) {
            labels.shift();
            dataConsumo.shift();
        }

        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = dataConsumo;
            chart.update();
        }

        actualizarTabla(data);

    } catch (error) {
        console.error("Error en monitoreo:", error);
    }
}

function actualizarTabla(data) {
    const tbody = document.getElementById("tablaEstados");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.slice(-10).forEach(dispositivo => {
        const fecha = dispositivo.fechaHora
            ? new Date(dispositivo.fechaHora).toLocaleTimeString()
            : "--";

        const fila = `
            <tr>
                <td>${dispositivo.nombre}</td>
                <td>${dispositivo.estado ? "ON" : "OFF"}</td>
                <td>${dispositivo.consumo} W</td>
                <td>${fecha}</td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}

function iniciarGrafica() {
    const canvas = document.getElementById("graficaConsumo");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Consumo Total (W)",
                data: dataConsumo,
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarGrafica();
    cargarMonitoreo();
    setInterval(cargarMonitoreo, 2000);
});
