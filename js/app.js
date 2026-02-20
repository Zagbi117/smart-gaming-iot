const API = "https://698a177dc04d974bc6a153aa.mockapi.io/api/v1/smart-gaming-iot";

let chart = null;

document.addEventListener("DOMContentLoaded", () => {

    iniciarGrafica();
    cargarTodo();
    mostrarHistorial();

    document.addEventListener("click", manejarClicks);

    setInterval(async () => {
        await cargarTodo(true);
        mostrarHistorial();
    }, 3000);
});

async function cargarTodo(actualizarGraficaFlag = true) {

    const res = await fetch(API);
    const data = await res.json();

    renderAdmin(data);
    renderControl(data);
    renderMonitoreo(data);

    if (actualizarGraficaFlag) {
        actualizarGrafica(data);
    }
}

function manejarClicks(e) {

    if (e.target.dataset.eliminar) {
        eliminarDispositivo(e.target.dataset.id, e.target.dataset.nombre);
    }

    if (e.target.dataset.estado) {
        cambiarEstado(
            e.target.dataset.id,
            e.target.dataset.estado === "true",
            e.target.dataset.nombre
        );
    }

    if (e.target.id === "btnLimpiarEncendidos") limpiarEncendidos();
    if (e.target.id === "btnLimpiarApagados") limpiarApagados();
    if (e.target.id === "btnLimpiarTodo") limpiarTodoHistorial();
}

function renderAdmin(data) {

    const tabla = document.getElementById("tabla");
    if (!tabla) return;

    tabla.innerHTML = data.map(d => `
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
                    data-eliminar="true"
                    data-id="${d.id}"
                    data-nombre="${d.nombre}">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join("");
}

function renderControl(data) {

    const contenedor = document.getElementById("control");
    if (!contenedor) return;

    contenedor.innerHTML = data.map(d => `
        <div class="col-md-4 mb-3">
            <div class="card p-3 text-center">
                <h5>${d.nombre}</h5>
                <p>${d.tipo}</p>
                <span class="badge ${d.estado ? 'bg-success' : 'bg-danger'} mb-2">
                    ${d.estado ? 'ON' : 'OFF'}
                </span>
                <div>
                    <button class="btn btn-success btn-sm me-2"
                        data-estado="true"
                        data-id="${d.id}"
                        data-nombre="${d.nombre}">
                        ON
                    </button>
                    <button class="btn btn-danger btn-sm"
                        data-estado="false"
                        data-id="${d.id}"
                        data-nombre="${d.nombre}">
                        OFF
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

function renderMonitoreo(data) {

    const tabla = document.getElementById("tablaMonitoreo");
    if (!tabla) return;

    tabla.innerHTML = data.map(d => `
        <tr>
            <td>${d.nombre}</td>
            <td>${d.estado ? "ON" : "OFF"}</td>
            <td>${d.consumo || 0} W</td>
            <td>${d.fechaHora ? new Date(d.fechaHora).toLocaleString() : "-"}</td>
        </tr>
    `).join("");
}

async function crearDispositivo() {

    const nombre = document.getElementById("nombre").value.trim();
    const tipo = document.getElementById("tipo").value.trim();

    if (!nombre || !tipo) return;

    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nombre,
            tipo,
            estado: false,
            consumo: 0,
            fechaHora: new Date().toISOString()
        })
    });

    document.getElementById("nombre").value = "";
    document.getElementById("tipo").value = "";

    await cargarTodo();
}

async function eliminarDispositivo(id, nombre) {

    if (!confirm(`¿Eliminar "${nombre}"?`)) return;

    await fetch(`${API}/${id}`, { method: "DELETE" });
    await cargarTodo();
}

async function cambiarEstado(id, estado, nombre) {

    if (!estado) {
        if (!confirm(`¿Apagar "${nombre}"?`)) return;
    }

    const res = await fetch(`${API}/${id}`);
    const dispositivo = await res.json();

    await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...dispositivo,
            estado,
            consumo: estado ? Math.floor(Math.random() * 200) + 50 : 0,
            fechaHora: new Date().toISOString()
        })
    });

    registrarEvento(nombre, estado ? "Encendido" : "Apagado");

    await cargarTodo();
    mostrarHistorial();
}

function iniciarGrafica() {

    const ctx = document.getElementById("graficaConsumo");
    if (!ctx) return;

    chart = new Chart(ctx.getContext("2d"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Consumo Total (W)",
                data: [],
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0
                }
            }
        }
    });
}

function actualizarGrafica(data) {

    if (!chart) return;

    const total = data
        .filter(d => d.estado)
        .reduce((acc, d) => acc + Number(d.consumo || 0), 0);

    const hora = new Date().toLocaleTimeString();

    chart.data.labels.push(hora);
    chart.data.datasets[0].data.push(total);

    if (chart.data.labels.length > 15) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.options.scales.y.max = Math.max(600, total + 100);

    chart.update();
}

function registrarEvento(nombre, accion) {

    const historial = JSON.parse(localStorage.getItem("historial")) || [];

    historial.push({
        nombre,
        accion,
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString()
    });

    localStorage.setItem("historial", JSON.stringify(historial));
}

function mostrarHistorial() {

    const historial = JSON.parse(localStorage.getItem("historial")) || [];

    const enc = document.getElementById("tablaEncendidos");
    const apa = document.getElementById("tablaApagados");
    const con = document.getElementById("tablaContador");

    if (!enc || !apa || !con) return;

    enc.innerHTML = "";
    apa.innerHTML = "";
    con.innerHTML = "";

    const contador = {};

    historial.forEach(e => {

        if (!contador[e.nombre])
            contador[e.nombre] = { enc: 0, apa: 0 };

        if (e.accion === "Encendido") {
            contador[e.nombre].enc++;
            enc.innerHTML += `<tr><td>${e.nombre}</td><td>${e.fecha}</td><td>${e.hora}</td></tr>`;
        }

        if (e.accion === "Apagado") {
            contador[e.nombre].apa++;
            apa.innerHTML += `<tr><td>${e.nombre}</td><td>${e.fecha}</td><td>${e.hora}</td></tr>`;
        }
    });

    Object.keys(contador).forEach(n => {
        con.innerHTML += `<tr><td>${n}</td><td>${contador[n].enc}</td><td>${contador[n].apa}</td></tr>`;
    });
}

function limpiarEncendidos() {
    const historial = JSON.parse(localStorage.getItem("historial")) || [];
    localStorage.setItem("historial",
        JSON.stringify(historial.filter(e => e.accion !== "Encendido"))
    );
    mostrarHistorial();
}

function limpiarApagados() {
    const historial = JSON.parse(localStorage.getItem("historial")) || [];
    localStorage.setItem("historial",
        JSON.stringify(historial.filter(e => e.accion !== "Apagado"))
    );
    mostrarHistorial();
}

function limpiarTodoHistorial() {
    if (!confirm("¿Borrar todo el historial?")) return;
    localStorage.removeItem("historial");
    mostrarHistorial();
}
