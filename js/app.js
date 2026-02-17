const API = "https://698a177dc04d974bc6a153aa.mockapi.io/api/v1/smart-gaming-iot";

let chart = null;

async function obtenerDispositivos() {
    try {
        const res = await fetch(API);
        const data = await res.json();

        mostrarTabla(data);
        mostrarControl(data);
        actualizarMonitoreo(data);
        mostrarHistorial();

    } catch (error) {
        console.error(error);
    }
}

function mostrarTabla(data) {
    const tabla = document.getElementById("tabla");
    if (!tabla) return;

    tabla.innerHTML = "";

    data.forEach(d => {
        tabla.innerHTML += `
        <tr>
            <td>${d.nombre}</td>
            <td>${d.tipo}</td>
            <td>
                <span class="badge ${d.estado ? 'bg-success' : 'bg-danger'}">
                    ${d.estado ? 'ON' : 'OFF'}
                </span>
            </td>
            <td>
                <button class="btn btn-danger btn-sm"
                onclick="eliminar('${d.id}')">Eliminar</button>
            </td>
        </tr>`;
    });
}

async function crearDispositivo() {
    const nombre = document.getElementById("nombre").value;
    const tipo = document.getElementById("tipo").value;

    if (!nombre || !tipo) {
        alert("Completa todos los campos");
        return;
    }

    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nombre,
            tipo,
            estado: false,
            consumo: 0,
            temperatura: 25,
            fechaHora: new Date().toISOString()
        })
    });

    document.getElementById("nombre").value = "";
    document.getElementById("tipo").value = "";

    obtenerDispositivos();
}

async function eliminar(id) {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    obtenerDispositivos();
}

function mostrarControl(data) {
    const div = document.getElementById("control");
    if (!div) return;

    div.innerHTML = "";

    data.forEach(d => {
        div.innerHTML += `
        <div class="card p-3 m-2">
            <h5>${d.nombre}</h5>
            <p>Temperatura: ${d.temperatura}°C</p>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox"
                ${d.estado ? "checked" : ""}
                onchange="cambiarEstado('${d.id}', ${d.estado}, '${d.tipo}', ${d.temperatura}, '${d.nombre}')">
            </div>
        </div>`;
    });
}

async function cambiarEstado(id, estadoActual, tipo, temperatura, nombre) {

    const nuevoEstado = !estadoActual;

    let nuevoConsumo = 0;
    let nuevaTemperatura = temperatura;

    if (nuevoEstado) {
        if (tipo.toLowerCase().includes("luz")) {
            nuevoConsumo = 30;
        } else if (tipo.toLowerCase().includes("ventil")) {
            nuevoConsumo = 60;
            nuevaTemperatura -= 5;
        } else if (tipo.toLowerCase().includes("monitor")) {
            nuevoConsumo = 80;
        } else {
            nuevoConsumo = 40;
        }
    }

    await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            estado: nuevoEstado,
            consumo: nuevoConsumo,
            temperatura: nuevaTemperatura,
            fechaHora: new Date().toISOString()
        })
    });

    guardarHistorial(nombre, nuevoEstado ? "Encendido" : "Apagado");

    obtenerDispositivos();
}

function guardarHistorial(nombre, accion) {

    const historial = JSON.parse(localStorage.getItem("historial")) || [];
    const ahora = new Date();

    historial.push({
        nombre: nombre,
        accion: accion,
        fecha: ahora.toLocaleDateString(),
        hora: ahora.toLocaleTimeString()
    });

    localStorage.setItem("historial", JSON.stringify(historial));
}

function calcularContadorEncendidos() {

    const historial = JSON.parse(localStorage.getItem("historial")) || [];
    const contador = {};

    historial.forEach(evento => {
        if (evento.accion === "Encendido") {
            contador[evento.nombre] = (contador[evento.nombre] || 0) + 1;
        }
    });

    return contador;
}

function mostrarHistorial() {

    const historial = JSON.parse(localStorage.getItem("historial")) || [];

    const tablaEncendidos = document.getElementById("tablaEncendidos");
    const tablaApagados = document.getElementById("tablaApagados");
    const tablaContador = document.getElementById("tablaContador");

    if (!tablaEncendidos || !tablaApagados || !tablaContador) return;

    tablaEncendidos.innerHTML = "";
    tablaApagados.innerHTML = "";
    tablaContador.innerHTML = "";

    historial.forEach(evento => {

        if (evento.accion === "Encendido") {
            tablaEncendidos.innerHTML += `
                <tr>
                    <td>${evento.nombre}</td>
                    <td>${evento.fecha}</td>
                    <td>${evento.hora}</td>
                </tr>`;
        }

        if (evento.accion === "Apagado") {
            tablaApagados.innerHTML += `
                <tr>
                    <td>${evento.nombre}</td>
                    <td>${evento.fecha}</td>
                    <td>${evento.hora}</td>
                </tr>`;
        }
    });

    const contador = calcularContadorEncendidos();

    for (let nombre in contador) {
        tablaContador.innerHTML += `
            <tr>
                <td>${nombre}</td>
                <td>${contador[nombre]}</td>
            </tr>`;
    }
}

function iniciarGrafica() {
    const ctx = document.getElementById("grafica");
    if (!ctx) return;

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Consumo Total (W)",
                data: [],
                borderColor: "rgb(0, 255, 255)",
                backgroundColor: "rgba(0,255,255,0.2)",
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function actualizarMonitoreo(data) {

    let consumoTotal = data.reduce((total, d) => {
        return total + Number(d.consumo || 0);
    }, 0);

    const tabla = document.getElementById("tablaMonitoreo");

    if (tabla) {
        tabla.innerHTML = "";

        data.forEach(d => {
            tabla.innerHTML += `
            <tr>
                <td>${d.nombre}</td>
                <td>${d.estado ? "ON" : "OFF"}</td>
                <td>${d.consumo} W</td>
                <td>${new Date(d.fechaHora).toLocaleString()}</td>
            </tr>`;
        });
    }

    if (chart) {
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(consumoTotal);

        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update();
    }
}

setInterval(() => {
    obtenerDispositivos();
}, 2000);

window.onload = () => {
    iniciarGrafica();
    obtenerDispositivos();
};
