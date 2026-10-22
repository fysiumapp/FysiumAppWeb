// Pacientes JS
let currentPatientId = null;
let currentPlanId = null;

const CATALOGO_RECOMENDACIONES = [
    { id: 'rec1', nombre: 'Estiramientos', icono: 'fa-child-reaching' },
    { id: 'rec2', nombre: 'Fuerza', icono: 'fa-dumbbell' },
    { id: 'rec3', nombre: 'Aplicar Frío', icono: 'fa-snowflake' },
    { id: 'rec4', nombre: 'Aplicar Calor', icono: 'fa-fire' },
    { id: 'rec5', nombre: 'Caminar 15m', icono: 'fa-person-walking' },
    { id: 'rec6', nombre: 'Higiene Postural', icono: 'fa-chair' }
];

let selectedRecs = [];
let allRecs = [...CATALOGO_RECOMENDACIONES];

const ICONOS_CUSTOM = [
    'fa-star', 'fa-heart', 'fa-briefcase', 'fa-bolt', 'fa-shield-halved', 'fa-apple-whole',
    'fa-person-running', 'fa-person-walking', 'fa-spa', 'fa-bicycle', 'fa-dumbbell', 'fa-baseball',
    'fa-child-reaching', 'fa-person', 'fa-chair', 'fa-fire', 'fa-snowflake', 'fa-droplet', 'fa-stopwatch'
];
let selectedCustomIcon = 'fa-star';

async function obtenerIdsRed() {
    let listaIdsFisios = [currentUser.id];

    if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
        const { data: fisiosData } = await supabaseClient
            .from('fisios')
            .select('user_id')
            .eq('clinica_id', window.currentProfileData.clinicaDataId);
        if (fisiosData) {
            fisiosData.forEach(f => listaIdsFisios.push(f.user_id));
        }
    } else if (window.currentProfileData && window.currentProfileData.rol === 'fisio') {
        const { data: misDatosFisio } = await supabaseClient.from('fisios').select('clinica_id').eq('user_id', currentUser.id).single();
        if (misDatosFisio?.clinica_id) {
            const { data: datosClinica } = await supabaseClient.from('clinicas').select('user_id').eq('id', misDatosFisio.clinica_id).single();
            if (datosClinica?.user_id) {
                listaIdsFisios.push(datosClinica.user_id);
            }
        }
    }
    return [...new Set(listaIdsFisios)]; // Devuelve IDs únicos
}

document.addEventListener('DOMContentLoaded', () => {
    // MÁSCARA AUTOMÁTICA DE FECHA DD/MM/AAAA (IDÉNTICA A LA APP MÓVIL)
    function aplicarMascaraFecha(input) {
        if (!input) return;
        input.setAttribute('maxlength', '10');
        let ultimoValor = input.value || '';
        if (input.form) {
            input.form.addEventListener('reset', () => {
                ultimoValor = '';
            });
        }
        input.addEventListener('input', () => {
            const texto = input.value;
            // Si el usuario está borrando caracteres
            if (texto.length < ultimoValor.length) {
                if (ultimoValor.endsWith('/') && !texto.endsWith('/')) {
                    input.value = texto.slice(0, -1);
                }
                ultimoValor = input.value;
                return;
            }
            const digitos = texto.replace(/\D/g, '').slice(0, 8);
            let formateado = '';
            if (digitos.length <= 2) {
                formateado = digitos.length === 2 ? `${digitos}/` : digitos;
            } else if (digitos.length <= 4) {
                formateado = `${digitos.slice(0, 2)}/${digitos.slice(2)}${digitos.length === 4 ? '/' : ''}`;
            } else {
                formateado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
            }
            input.value = formateado;
            ultimoValor = formateado;
        });
    }
    // Activamos la máscara en los dos formularios de alta de cliente en la Web
    aplicarMascaraFecha(document.getElementById('np-dob'));
    aplicarMascaraFecha(document.getElementById('nuevoFechaNac'));
    // Alta de Paciente
    const form = document.getElementById('newPatientForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('np-name').value.trim();
        const email = document.getElementById('np-email').value.trim();

        // LÓGICA DE PREFIJOS
        const rawPhone = document.getElementById('np-phone').value.trim();
        const prefijo = document.getElementById('np-prefix').innerText;
        const phone = rawPhone ? prefijo + rawPhone : null;

        // AÑADIDO: Capturamos la fecha de nacimiento si el elemento existe
        const dobInput = document.getElementById('np-dob');
        const dob = dobInput ? dobInput.value.trim() : null;

        const btn = form.querySelector('button');

        if (!nombre) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            const uuid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

            const emailFinal = email || `fantasma.${Math.random().toString(36).substring(2, 8)}@fysium.app`;

            const { error: errorUser } = await supabaseClient
                .from('auth_user')
                .insert([{
                    id_supabase: uuid,
                    username: nombre,
                    telefono: phone || null,
                    email: emailFinal,
                    fecha_nacimiento: dob || null, // Guardamos la fecha
                    es_fantasma: true
                }]);

            if (errorUser && errorUser.code !== '23505') throw errorUser;

            const { error: errorMis } = await supabaseClient
                .from('mis_pacientes')
                .insert([{ fisio_id: currentUser.id, cliente_id: uuid, activo: true }]);

            if (errorMis && errorMis.code !== '23505') throw errorMis;

            alert('Cliente dado de alta y añadido a tu lista exitosamente.');
            form.reset();

            if (window.cargarPacientes) window.cargarPacientes();

            // Navega automáticamente a la pestaña de pacientes
            const tabPacientes = document.querySelector('[data-tab="pacientes"]');
            if (tabPacientes) tabPacientes.click();

        } catch (error) {
            console.error(error);
            alert("Error al guardar cliente: " + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Guardar Cliente";
        }
    });

    // Variables globales para la búsqueda
    window.allMyPatients = [];
    window.misPacientesRel = [];

    // Búsqueda
    document.getElementById('searchPatientInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();

        if (val.trim() === '') {
            // Mostrar solo activos si no hay búsqueda
            const activos = window.allMyPatients.filter(u => {
                const rel = window.misPacientesRel.find(r => r.cliente_id === u.id_supabase);
                return rel && rel.activo;
            });
            window.renderizarPacientesList(activos);
        } else {
            // Mostrar cualquier paciente histórico (activo o inactivo) que coincida
            const filtrados = window.allMyPatients.filter(u => {
                return (u.username || '').toLowerCase().includes(val);
            });
            window.renderizarPacientesList(filtrados);
        }
    });

    // Volver a pacientes
    document.getElementById('backToPatientsBtn').addEventListener('click', () => {
        document.getElementById('tab-detalle-paciente').classList.remove('active');
        document.getElementById('tab-pacientes').classList.add('active');
    });

    // Control de Duración
    document.querySelectorAll('.dur-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = e.target.closest('.btn-group');
            document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Creador de Recomendaciones (Modal)
    document.getElementById('closeRecModalBtn').addEventListener('click', () => {
        document.getElementById('newRecModal').style.display = 'none';
    });

    document.getElementById('addCustomRecBtn').addEventListener('click', () => {
        const nombreStr = document.getElementById('customRecName').value.trim();
        if (!nombreStr) return alert("Ponle un nombre a tu recomendación.");
        const idUnico = `custom_${Date.now()}`;
        const itemCreado = { id: idUnico, nombre: nombreStr, icono: selectedCustomIcon, isCustom: true };
        allRecs.push(itemCreado);
        selectedRecs.push(idUnico);
        guardarCustomRecsDelFisio(); // Guarda en el catálogo del profesional
        document.getElementById('newRecModal').style.display = 'none';
        document.getElementById('customRecName').value = '';
        selectedCustomIcon = 'fa-star';
        renderRecommendationsGrid();
    });

    // 1. Botón NUEVO PLAN en Web
    const btnNuevoPlan = document.getElementById('btnNuevoPlanWeb');
    if (btnNuevoPlan) {
        btnNuevoPlan.addEventListener('click', () => {
            window.esNuevoPlanWeb = true;
            currentPlanId = null;
            window.currentPlanVigente = false;
            selectedRecs = [];
            document.getElementById('dpNotas').value = '';
            document.getElementById('dpTratamiento').value = '';
            document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
            const defaultDur = document.querySelector('.btn-group[data-type="semanas"] .dur-btn[data-val="1"]');
            if (defaultDur) defaultDur.classList.add('active');
            renderRecommendationsGrid();
            alert("Formulario listo para redactar un nuevo plan independiente.");
        });
    }
    // 2. Botones del Modal de Sustitución
    const btnCancelarModal = document.getElementById('btnCancelarSustituirWeb');
    if (btnCancelarModal) {
        btnCancelarModal.addEventListener('click', () => {
            document.getElementById('modalSustituirPlanWeb').style.display = 'none';
        });
    }
    const btnConfirmarModal = document.getElementById('btnConfirmarSustituirWeb');
    if (btnConfirmarModal) {
        btnConfirmarModal.addEventListener('click', () => {
            document.getElementById('modalSustituirPlanWeb').style.display = 'none';
            ejecutarGuardadoFichaWeb();
        });
    }
    // 3. Listener al pulsar Guardar Ficha
    document.getElementById('saveTratamientoBtn').addEventListener('click', async () => {
        if (!currentPatientId) return;
        // Si NO es nuevo plan, existe un plan cargado y sigue vigente -> Aviso con modal
        if (!window.esNuevoPlanWeb && currentPlanId && window.currentPlanVigente) {
            document.getElementById('modalSustituirPlanWeb').style.display = 'flex';
            return;
        }
        // Si es un nuevo plan (o ya caducó el anterior), guardamos directamente
        ejecutarGuardadoFichaWeb();
    });
    // 4. Función de guardado (Actualizar o Insertar nuevo independiente)
    async function ejecutarGuardadoFichaWeb() {
        const btn = document.getElementById('saveTratamientoBtn');
        btn.disabled = true;
        btn.textContent = "Guardando...";
        const textoPrivado = document.getElementById('dpTratamiento').value;
        const notas = document.getElementById('dpNotas').value;
        // Obtener duración
        const activeDurBtn = document.querySelector('.dur-btn.active');
        const durVal = activeDurBtn ? activeDurBtn.dataset.val : 1;
        const durType = activeDurBtn ? activeDurBtn.closest('.btn-group').dataset.type : 'semanas';
        const duracionTexto = `${durVal} ${durType}`;
        // Obtener fecha fin
        const fechaFin = new Date();
        if (durType === 'días') fechaFin.setDate(fechaFin.getDate() + parseInt(durVal));
        else if (durType === 'semanas') fechaFin.setDate(fechaFin.getDate() + (parseInt(durVal) * 7));
        else if (durType === 'meses') fechaFin.setMonth(fechaFin.getMonth() + parseInt(durVal));
        // Obtener array de ejercicios
        const arrayCompleto = selectedRecs.map(idItem => allRecs.find(e => e.id === idItem)).filter(Boolean);
        const ejerciciosStr = JSON.stringify(arrayCompleto);
        const dataPayload = {
            ejercicios: ejerciciosStr,
            tratamiento_privado: textoPrivado,
            reposo: notas,
            fecha_fin: fechaFin.toISOString(),
            duracion_texto: duracionTexto,
            updated_at: new Date().toISOString()
        };
        try {
            if (!window.esNuevoPlanWeb && currentPlanId) {
                // ACTUALIZAR PLAN EXISTENTE
                const { error } = await supabaseClient.from('planes_recuperacion').update(dataPayload).eq('id', currentPlanId);
                if (error) throw error;
            } else {
                // INSERTAR NUEVO PLAN INDEPENDIENTE
                let planFisioId = currentUser.id;
                const rel = window.misPacientesRel ? window.misPacientesRel.find(r => r.cliente_id === currentPatientId) : null;
                if (rel && rel.fisio_id) planFisioId = rel.fisio_id;
                const { data, error } = await supabaseClient.from('planes_recuperacion').insert([{
                    fisio_id: planFisioId,
                    cliente_id: currentPatientId,
                    ...dataPayload
                }]).select('id').single();
                if (error) throw error;
                currentPlanId = data.id;
                window.esNuevoPlanWeb = false;
            }
            // Insertar en historial permanente
            let histFisioId = currentUser.id;
            const relHist = window.misPacientesRel ? window.misPacientesRel.find(r => r.cliente_id === currentPatientId) : null;
            if (relHist && relHist.fisio_id) histFisioId = relHist.fisio_id;
            await supabaseClient.from('historial_seguimiento').insert([{
                fisio_id: histFisioId,
                cliente_id: currentPatientId,
                ejercicios: ejerciciosStr,
                tratamiento_privado: textoPrivado,
                reposo: notas,
                duracion_texto: duracionTexto,
                fecha: new Date().toISOString()
            }]);
            // Notificación Push si el paciente la tiene activa
            try {
                const { data: rpcData } = await supabaseClient.rpc('obtener_token_y_preferencias', {
                    usuario_objetivo: currentPatientId
                });
                const userPref = rpcData && rpcData.length > 0 ? rpcData[0] : null;
                if (userPref && userPref.push_token && (userPref.alertas_seguimiento === true || userPref.alertas_seguimiento === null)) {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-encoding': 'gzip, deflate',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            to: userPref.push_token,
                            sound: 'default',
                            title: '💪 Plan de Seguimiento Actualizado',
                            body: `Tu profesional, ${currentUser.user_metadata?.username || 'tu profesional'}, ha actualizado tus recomendaciones.`
                        })
                    });
                }
            } catch (errNotif) {
                console.error("Error silencioso al notificar al cliente:", errNotif);
            }
            alert("Ficha guardada correctamente y añadida al historial.");
            window.cargarFichaPaciente({ id_supabase: currentPatientId, ...window.currentPatientObj });
        } catch (e) {
            console.error(e);
            alert("Error al guardar: " + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Guardar Ficha";
        }
    }
});

function renderCustomIcons() {
    const grid = document.getElementById('customRecIconsGrid');
    grid.innerHTML = '';
    ICONOS_CUSTOM.forEach(ico => {
        const btn = document.createElement('div');
        btn.className = `icon-selector ${selectedCustomIcon === ico ? 'active' : ''}`;
        btn.innerHTML = `<i class="fa-solid ${ico}"></i>`;
        btn.onclick = () => {
            selectedCustomIcon = ico;
            renderCustomIcons();
        };
        grid.appendChild(btn);
    });
}

// Cargar catálogo personalizado del profesional actual
function cargarCustomRecsDelFisio() {
    if (!currentUser) return;
    try {
        const guardadas = localStorage.getItem(`fysium_custom_recs_${currentUser.id}`);
        if (guardadas) {
            const lista = JSON.parse(guardadas);
            lista.forEach(item => {
                if (!allRecs.find(e => e.id === item.id)) {
                    allRecs.push({ ...item, isCustom: true });
                }
            });
        }
    } catch (e) {
        console.error("Error al cargar recomendaciones personalizadas:", e);
    }
}
// Guardar catálogo personalizado del profesional actual
function guardarCustomRecsDelFisio() {
    if (!currentUser) return;
    try {
        const customs = allRecs.filter(r => r.isCustom);
        localStorage.setItem(`fysium_custom_recs_${currentUser.id}`, JSON.stringify(customs));
    } catch (e) {
        console.error("Error al guardar recomendaciones personalizadas:", e);
    }
}
// Función global para borrar una recomendación personalizada
window.borrarRecomendacionCustom = function (id, nombre) {
    if (!confirm(`¿Seguro que deseas eliminar "${nombre}" de tu catálogo de recomendaciones?`)) return;
    // Se anota en la lista de eliminadas para que no vuelva a importarse de planes antiguos
    try {
        const keyDeleted = `fysium_deleted_custom_recs_${currentUser.id}`;
        const eliminadas = JSON.parse(localStorage.getItem(keyDeleted) || '[]');
        if (!eliminadas.includes(id)) {
            eliminadas.push(id);
            localStorage.setItem(keyDeleted, JSON.stringify(eliminadas));
        }
    } catch (e) { }
    allRecs = allRecs.filter(r => r.id !== id);
    selectedRecs = selectedRecs.filter(sId => sId !== id);
    guardarCustomRecsDelFisio();
    renderRecommendationsGrid();
};
function renderRecommendationsGrid() {
    const grid = document.getElementById('dpRecomendaciones');
    grid.innerHTML = '';
    allRecs.forEach(item => {
        const div = document.createElement('div');
        div.className = `rec-card ${selectedRecs.includes(item.id) ? 'active' : ''}`;
        // Si es personalizada, añadimos un botoncito discreto de eliminar
        let deleteBtnHtml = '';
        if (item.isCustom) {
            deleteBtnHtml = `
                <button type="button" class="btn-borrar-custom-rec" onclick="event.stopPropagation(); window.borrarRecomendacionCustom('${item.id}', '${item.nombre}')" title="Eliminar recomendación">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        }
        div.innerHTML = `
            <i class="fa-solid ${item.icono}"></i> 
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.nombre}</span>
            ${deleteBtnHtml}
        `;
        div.onclick = () => {
            if (selectedRecs.includes(item.id)) selectedRecs = selectedRecs.filter(i => i !== item.id);
            else selectedRecs.push(item.id);
            renderRecommendationsGrid();
        };
        grid.appendChild(div);
    });
    const newCard = document.createElement('div');
    newCard.className = 'rec-card';
    newCard.style.cssText = "background-color: #F0F5F5; border-style: dashed; border-width: 2px; border-color: var(--primary);";
    newCard.innerHTML = `<i class="fa-solid fa-plus" style="color:var(--primary)"></i> <span style="color:var(--primary)">Nuevo</span>`;
    newCard.onclick = () => {
        document.getElementById('newRecModal').style.display = 'flex';
        renderCustomIcons();
    };
    grid.appendChild(newCard);
}


window.renderizarPacientesList = function (grupos) {
    const list = document.getElementById('patientsList');
    list.innerHTML = '';

    const renderizarSeccion = (titulo, listaPacientes) => {
        if (!listaPacientes || listaPacientes.length === 0) return;

        const h3 = document.createElement('h3');
        h3.className = 'section-title';
        h3.style.marginTop = '20px';
        h3.style.color = 'var(--primary)';
        h3.textContent = titulo;
        list.appendChild(h3);

        listaPacientes.forEach(u => {
            const esManual = Boolean(u.es_fantasma || (u.email && u.email.includes('@fysium.app')));
            const card = document.createElement('div');
            card.className = `patient-card ${esManual ? 'is-manual' : ''}`;
            card.style.cursor = 'pointer';
            let avatarHtml = `<div class="avatar" style="${esManual ? 'background: #94A3B8;' : ''}">${(u.username || 'C').charAt(0).toUpperCase()}</div>`;
            if (u.foto_perfil_url) avatarHtml = `<img src="${u.foto_perfil_url}" class="avatar" style="object-fit:cover">`;
            const badgeHtml = esManual
                ? `<span class="badge-manual"><i class="fa-regular fa-clipboard"></i> Manual</span>`
                : `<span class="badge-app"><i class="fa-solid fa-mobile-screen-button"></i> App</span>`;
            const emailTexto = esManual
                ? (u.telefono ? `<i class="fa-solid fa-phone" style="font-size:0.75rem"></i> ${u.telefono} · <span style="font-style:italic">Cliente manual</span>` : '<span style="font-style:italic">Cliente creado manualmente</span>')
                : (u.email || 'Sin correo');
            card.innerHTML = `
                ${avatarHtml}
                <div class="patient-info">
                    <div class="patient-name" style="display: flex; align-items: center;">
                        <span>${u.username}</span>
                        ${badgeHtml}
                    </div>
                    <div class="patient-email">${emailTexto}</div>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:var(--text-light)"></i>
            `;
            card.onclick = () => window.cargarFichaPaciente(u);
            list.appendChild(card);
        });
    };

    // Renderizar Mis Pacientes primero
    renderizarSeccion('Mis Clientes', grupos['Mis Clientes']);

    // Renderizar Clínica después
    renderizarSeccion('Clientes del Centro', grupos['Clientes del Centro']);

    // Renderizar resto de fisios
    Object.keys(grupos['otros']).forEach(nombreFisio => {
        renderizarSeccion(nombreFisio, grupos['otros'][nombreFisio]);
    });
};

window.cargarPacientes = async function () {
    if (!currentUser) return;
    const list = document.getElementById('patientsList');
    list.innerHTML = '<div class="loading-spinner py-4 text-center"><i class="fa fa-spinner fa-spin"></i> Cargando...</div>';

    try {
        let listaIdsFisios = [currentUser.id];
        window.mapFisiosPacientes = {};
        window.mapFisiosPacientes[currentUser.id] = window.currentProfileData.nombre;

        let idClinicaOwner = null;

        if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
            idClinicaOwner = currentUser.id;
            const { data: fisiosData } = await supabaseClient
                .from('fisios')
                .select('user_id, nombre')
                .eq('clinica_id', window.currentProfileData.clinicaDataId);
            if (fisiosData) {
                fisiosData.forEach(f => {
                    listaIdsFisios.push(f.user_id);
                    window.mapFisiosPacientes[f.user_id] = f.nombre;
                });
            }
        } else if (window.currentProfileData && window.currentProfileData.rol === 'fisio') {
            const { data: misDatosFisio } = await supabaseClient.from('fisios').select('clinica_id').eq('user_id', currentUser.id).single();
            if (misDatosFisio?.clinica_id) {
                const { data: datosClinica } = await supabaseClient.from('clinicas').select('user_id').eq('id', misDatosFisio.clinica_id).single();
                if (datosClinica?.user_id) {
                    idClinicaOwner = datosClinica.user_id;
                    listaIdsFisios.push(datosClinica.user_id);
                }
            }
        }

        // Obtenemos todos los pacientes del fisio (activos e inactivos)
        const { data: misPacientes } = await supabaseClient
            .from('mis_pacientes')
            .select('cliente_id, activo, fisio_id')
            .in('fisio_id', listaIdsFisios);

        window.misPacientesRel = misPacientes || [];
        if (!misPacientes?.length) {
            list.innerHTML = '<p class="text-center text-light py-4">Aún no tienes clientes guardados.</p>';
            return;
        }

        const { data: usuarios } = await supabaseClient
            .from('auth_user')
            .select('*')
            .in('id_supabase', misPacientes.map(mp => mp.cliente_id));

        window.allMyPatients = usuarios || [];

        // --- LÓGICA DE AGRUPACIÓN ---
        const grupos = { 'Mis Clientes': [], 'Clientes del Centro': [], 'otros': {} };
        window.misPacientesRel.forEach(rel => {
            if (!rel.activo) return;
            const u = window.allMyPatients.find(p => p.id_supabase === rel.cliente_id);
            if (!u) return;
            // Clasificamos asegurando que no metemos el mismo paciente 2 veces en el MISMO grupo
            if (rel.fisio_id === currentUser.id) {
                if (!grupos['Mis Clientes'].some(p => p.id_supabase === u.id_supabase)) {
                    grupos['Mis Clientes'].push(u);
                }
            } else if (rel.fisio_id === idClinicaOwner) {
                if (!grupos['Clientes del Centro'].some(p => p.id_supabase === u.id_supabase)) {
                    grupos['Clientes del Centro'].push(u);
                }
            } else {
                const nombreFisio = window.mapFisiosPacientes[rel.fisio_id] || 'Profesional';
                const key = `Clientes de ${nombreFisio}`;
                if (!grupos['otros'][key]) grupos['otros'][key] = [];

                if (!grupos['otros'][key].some(p => p.id_supabase === u.id_supabase)) {
                    grupos['otros'][key].push(u);
                }
            }
        });

        window.renderizarPacientesList(grupos);

    } catch (error) {
        console.error(error);
        list.innerHTML = '<div class="text-danger text-center py-4">Error al cargar clientes.</div>';
    }
};

window.cargarFichaPaciente = async function (userObj) {
    window.currentPatientObj = userObj;
    currentPatientId = userObj.id_supabase;
    currentPlanId = null;
    selectedRecs = [];
    allRecs = [...CATALOGO_RECOMENDACIONES];
    cargarCustomRecsDelFisio();

    // Cambiar vista
    document.getElementById('tab-pacientes').classList.remove('active');
    document.getElementById('tab-detalle-paciente').classList.add('active');

    // Comprobar estado de activo para configurar el botón de favorito
    const rel = window.misPacientesRel ? window.misPacientesRel.find(r => r.cliente_id === currentPatientId && r.fisio_id === currentUser.id) : null;
    const toggleBtn = document.getElementById('quitarPacienteBtn');

    if (rel && rel.activo) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Retirar de mis clientes';
        toggleBtn.style.color = '#e74c3c';
        toggleBtn.dataset.action = 'remove';
    } else {
        toggleBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Añadir a mis clientes';
        toggleBtn.style.color = 'var(--primary)';
        toggleBtn.dataset.action = 'add';
    }

    // Poblar info con distinción Manual vs App
    const esManual = Boolean(userObj.es_fantasma || (userObj.email && userObj.email.includes('@fysium.app')));
    const badgeFichaHtml = esManual
        ? `<span class="badge-manual"><i class="fa-regular fa-clipboard"></i> Manual</span>`
        : `<span class="badge-app"><i class="fa-solid fa-mobile-screen-button"></i> App</span>`;
    document.getElementById('dpName').innerHTML = `${userObj.username} ${badgeFichaHtml}`;
    document.getElementById('dpAvatar').textContent = userObj.username.charAt(0).toUpperCase();
    if (userObj.foto_perfil_url) document.getElementById('dpAvatar').innerHTML = `<img src="${userObj.foto_perfil_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover">`;
    document.getElementById('dpPhone').textContent = userObj.telefono || 'Sin teléfono';
    document.getElementById('dpEmail').textContent = esManual ? 'Sin cuenta en la app' : (userObj.email || 'Sin correo');
    document.getElementById('dpDob').textContent = userObj.fecha_nacimiento || 'Sin fecha de nac.';
    // Cargar Plan
    let listaIdsFisios = [currentUser.id];
    if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
        const { data: fisiosData } = await supabaseClient
            .from('fisios')
            .select('user_id')
            .eq('clinica_id', window.currentProfileData.clinicaDataId);
        if (fisiosData && fisiosData.length > 0) {
            fisiosData.forEach(f => listaIdsFisios.push(f.user_id));
        }
    }
    const { data: planData } = await supabaseClient
        .from('planes_recuperacion')
        .select('*')
        .in('fisio_id', listaIdsFisios)
        .eq('cliente_id', currentPatientId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (planData) {
        currentPlanId = planData.id;
        window.currentPlanVigente = planData.fecha_fin ? new Date(planData.fecha_fin) > new Date() : false;
        window.esNuevoPlanWeb = false;
        // Cargar las notas del plan si existen
        document.getElementById('dpTratamiento').value = planData.tratamiento_privado || '';
        document.getElementById('dpNotas').value = planData.reposo || '';
        try {
            if (planData.ejercicios) {
                const parsed = JSON.parse(planData.ejercicios);
                const recIds = [];
                const keyDeleted = currentUser ? `fysium_deleted_custom_recs_${currentUser.id}` : '';
                const eliminadas = keyDeleted ? JSON.parse(localStorage.getItem(keyDeleted) || '[]') : [];
                parsed.forEach(i => {
                    const idObj = typeof i === 'string' ? i : i.id;
                    recIds.push(idObj);
                    if (typeof i === 'object' && i.isCustom && !eliminadas.includes(i.id) && !allRecs.find(e => e.id === i.id)) {
                        allRecs.push({ id: i.id, nombre: i.nombre, icono: i.icono.replace('md-', 'fa-'), isCustom: true });
                    }
                });
                selectedRecs = [...new Set(recIds)];
            }
        } catch (e) { }
        if (planData.duracion_texto) {
            const [val, type] = planData.duracion_texto.split(' ');
            document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`.btn-group[data-type="${type}"] .dur-btn[data-val="${val}"]`);
            if (btn) btn.classList.add('active');
        }
    } else {
        document.getElementById('dpTratamiento').value = '';
        document.getElementById('dpNotas').value = '';
    }

    renderRecommendationsGrid();

    // Cargar Historial
    const { data: histData } = await supabaseClient
        .from('historial_seguimiento')
        .select('*')
        .eq('cliente_id', currentPatientId)
        .order('fecha', { ascending: false });

    const hList = document.getElementById('dpHistorialList');
    if (!histData || histData.length === 0) {
        hList.innerHTML = `<p class="text-light text-center" style="font-size:0.9rem; margin-top:2rem;"><i class="fa-solid fa-folder-open mb-2" style="font-size:2rem; opacity:0.5"></i><br>No hay historial todavía.</p>`;
    } else {
        hList.innerHTML = '';
        histData.forEach(item => {
            const dateStr = item.fecha ? item.fecha.split('T')[0] : 'Sin fecha';
            const dateObj = new Date(dateStr);
            const dateFormatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

            let pillsHtml = '';
            try {
                if (item.ejercicios) {
                    const p = JSON.parse(item.ejercicios);
                    p.forEach(e => {
                        const name = typeof e === 'string' ? (allRecs.find(r => r.id === e)?.nombre || e) : e.nombre;
                        const icon = typeof e === 'string' ? (allRecs.find(r => r.id === e)?.icono || 'fa-dumbbell') : (e.icono ? e.icono.replace('md-', 'fa-') : 'fa-dumbbell');
                        pillsHtml += `<div class="history-pill"><i class="fa-solid ${icon}" style="color:var(--primary)"></i> ${name}</div>`;
                    });
                }
            } catch (e) { }

            const html = `
                <div class="history-card">
                    <div class="history-header">
                        <div class="history-date-badge">
                            <i class="fa-regular fa-calendar-days"></i> ${dateFormatted}
                        </div>
                        <button class="history-delete-btn" onclick="borrarHistorial('${item.id}')" title="Borrar registro">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    <div class="history-body">
                        ${pillsHtml ? `
                            <div style="font-weight:700; font-size:0.8rem; color:var(--text); margin-bottom:6px;"><i class="fa-solid fa-dumbbell text-light"></i> Ejercicios:</div>
                            <div class="history-pills mb-3" style="display:flex; flex-wrap:wrap; gap:6px;">${pillsHtml}</div>
                        ` : ''}
                        
                        ${item.reposo ? `
                            <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px; border-radius:10px; margin-bottom:8px;">
                                <div style="font-weight:700; font-size:0.75rem; color:#64748B; text-transform:uppercase; margin-bottom:3px;"><i class="fa-regular fa-file-lines"></i> Notas para el cliente:</div>
                                <div style="font-size:0.85rem; color:var(--text);">${item.reposo}</div>
                            </div>
                        ` : ''}
                        ${item.tratamiento_privado ? `
                            <div style="background:#FFFBEB; padding:10px; border-radius:10px; border:1px solid #FDE68A;">
                                <div style="font-weight:700; font-size:0.75rem; color:#B45309; text-transform:uppercase; margin-bottom:3px;"><i class="fa-solid fa-lock"></i> Notas privadas (solo tú):</div>
                                <div style="font-size:0.85rem; color:#92400E;">${item.tratamiento_privado}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            hList.innerHTML += html;
        });
    }
};

window.borrarHistorial = async function (id) {
    if (confirm('¿Seguro que quieres borrar este registro del historial?')) {
        try {
            await supabaseClient.from('historial_seguimiento').delete().eq('id', id);
            window.cargarFichaPaciente({ id_supabase: currentPatientId, ...window.currentPatientObj });
        } catch (e) {
            console.error(e);
            alert("Error al borrar el registro.");
        }
    }
}

window.abrirPacienteDesdeCalendario = async function (clienteId) {
    if (!clienteId) return;

    // Obtener datos del paciente
    const { data: userData, error } = await supabaseClient
        .from('auth_user')
        .select('*')
        .eq('id_supabase', clienteId)
        .single();

    if (error || !userData) {
        alert("No se pudo cargar la información de este cliente.");
        return;
    }

    let listaIdsFisios = [currentUser.id];
    if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
        const { data: fisiosData } = await supabaseClient
            .from('fisios')
            .select('user_id')
            .eq('clinica_id', window.currentProfileData.clinicaDataId);
        if (fisiosData && fisiosData.length > 0) {
            fisiosData.forEach(f => listaIdsFisios.push(f.user_id));
        }
    }

    // Comprobar si ya está en mis_pacientes
    const { data: misData } = await supabaseClient
        .from('mis_pacientes')
        .select('*')
        .in('fisio_id', listaIdsFisios)
        .eq('cliente_id', clienteId)
        .limit(1)
        .single();

    if (!misData) {
        const quiereGuardar = confirm(`El cliente ${userData.username || 'desconocido'} no está guardado en tu lista "Mis Clientes". ¿Deseas añadirlo ahora para poder ver y editar su ficha de recomendaciones?`);
        if (quiereGuardar) {
            await supabaseClient.from('mis_pacientes').insert([{ fisio_id: currentUser.id, cliente_id: clienteId }]);
        } else {
            return; // Aborta si no quiere añadirlo
        }
    }

    // Navegar a la pestaña pacientes y abrir su ficha
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const pTab = document.querySelector('.nav-item[data-tab="pacientes"]');
    if (pTab) pTab.classList.add('active');

    document.getElementById('pageTitle').textContent = "Mis Clientes";

    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab-pacientes').classList.remove('active');

    window.cargarFichaPaciente(userData);
};

document.getElementById('quitarPacienteBtn').addEventListener('click', async () => {
    if (!currentPatientId) return;

    const action = document.getElementById('quitarPacienteBtn').dataset.action || 'remove';

    if (action === 'remove') {
        if (!confirm("¿Retirar a este cliente de tu lista principal? Podrás volver a añadirlo después y no perderás su historial.")) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('mis_pacientes')
                .update({ activo: false })
                .eq('fisio_id', currentUser.id)
                .eq('cliente_id', currentPatientId);

            if (error) throw error;

            alert("Cliente retirado de tu lista.");

            const hoyStr = new Date().toISOString().split('T')[0];
            await supabaseClient
                .from('horarios_disponibles')
                .update({ estado: 'libre', cliente_id: null, motivo: null })
                .eq('fisio_id', currentUser.id)
                .eq('cliente_id', currentPatientId)
                .gte('dia', hoyStr)
                .eq('estado', 'reservado');

            // Volver a la pestaña de pacientes
            document.getElementById('tab-detalle-paciente').classList.remove('active');
            document.getElementById('tab-pacientes').classList.add('active');

            // Recargar la lista
            window.cargarPacientes();
        } catch (error) {
            console.error(error);
            alert("Error al retirar al cliente: " + error.message);
        }
    } else {
        // action === 'add'
        try {
            let listaIdsFisios = [currentUser.id];
            if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
                const { data: fisiosData } = await supabaseClient.from('fisios').select('user_id').eq('clinica_id', window.currentProfileData.clinicaDataId);
                if (fisiosData) fisiosData.forEach(f => listaIdsFisios.push(f.user_id));
            }

            const { data: exists } = await supabaseClient
                .from('mis_pacientes')
                .select('id, fisio_id')
                .in('fisio_id', listaIdsFisios)
                .eq('cliente_id', currentPatientId)
                .limit(1)
                .single();

            if (exists) {
                const { error } = await supabaseClient
                    .from('mis_pacientes')
                    .update({ activo: true })
                    .eq('id', exists.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('mis_pacientes')
                    .insert([{ fisio_id: currentUser.id, cliente_id: currentPatientId, activo: true }]);
                if (error) throw error;
            }

            alert("Cliente añadido a tu lista de favoritos.");

            // Volver a la pestaña de pacientes
            document.getElementById('tab-detalle-paciente').classList.remove('active');
            document.getElementById('tab-pacientes').classList.add('active');

            // Recargar la lista
            window.cargarPacientes();
        } catch (error) {
            console.error(error);
            alert("Error al añadir al cliente: " + error.message);
        }
    }
});
