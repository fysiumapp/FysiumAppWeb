let currentUser = null;

// const DIAS_DE_PRUEBA = 15;

const DIAS_DE_PRUEBA = 5;

const HITOS_AVISO = [0, 30, 60, 90];

document.addEventListener('DOMContentLoaded', async () => {
    // PROTEGER RUTA
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;

    // VERIFICAR ROL
    const { data: perfilData, error: perfilError } = await supabaseClient
        .from('gestion_perfil')
        .select('rol')
        .eq('user_id', currentUser.id)
        .single();

    if (perfilError || !perfilData) {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    const rol = perfilData.rol;
    let userData = null;

    if (rol === 'clinica') {
        const { data, error } = await supabaseClient.from('clinicas').select('*').eq('user_id', currentUser.id).single();
        if (error || !data) { await supabaseClient.auth.signOut(); window.location.href = 'login.html'; return; }
        userData = data;

        // UI ADAPTATIVO PARA CLÍNICA
        document.getElementById('navFisios').style.display = 'block';
        const navPerfilText = document.getElementById('navPerfilText');
        if (navPerfilText) navPerfilText.textContent = "Perfil de la Clínica";
    } else {
        const { data, error } = await supabaseClient.from('fisios').select('*').eq('user_id', currentUser.id).single();
        if (error || !data) { await supabaseClient.auth.signOut(); window.location.href = 'login.html'; return; }
        userData = data;
    }

    // --- LÓGICA DE BLOQUEO WEB ---
    //     let plan = userData.plan_suscripcion || 'free';
    //     let cuentaBloqueada = false;
    //     let fechaRegistroBase = new Date(currentUser.created_at);
    // 
    //     if (rol === 'fisio' && userData.clinica_id) {
    //         const { data: clinicaAsociada } = await supabaseClient
    //             .from('clinicas')
    //             .select('plan_suscripcion, fecha_fin_prueba, created_at, user_id')
    //             .eq('id', userData.clinica_id)
    //             .single();
    // 
    //         if (clinicaAsociada) {
    // SINCRONIZAR BBDD SI EL FISIO TIENE PLAN DISTINTO AL DE LA CLÍNICA
    //             const planFisioActual = (userData.plan_suscripcion || '').trim().toLowerCase();
    //             const planPadreClean = (clinicaAsociada.plan_suscripcion || '').trim().toLowerCase();
    //             if (planFisioActual !== planPadreClean) {
    //                 supabaseClient.from('fisios').update({ plan_suscripcion: planPadreClean }).eq('user_id', currentUser.id).then();
    //             }
    // 
    //             userData.plan_suscripcion = clinicaAsociada.plan_suscripcion;
    //             userData.fecha_fin_prueba = clinicaAsociada.fecha_fin_prueba;
    // 
    //             let realCreatedAt = clinicaAsociada.created_at;
    //             if (clinicaAsociada.user_id) {
    //                 const { data: perfilData } = await supabaseClient.from('gestion_perfil')
    //                     .select('created_at')
    //                     .eq('user_id', clinicaAsociada.user_id)
    //                     .single();
    //                 if (perfilData && perfilData.created_at) {
    //                     realCreatedAt = perfilData.created_at;
    //                 } else {
    //                     const { data: authUserData } = await supabaseClient.from('auth_user')
    //                         .select('created_at')
    //                         .eq('id_supabase', clinicaAsociada.user_id)
    //                         .single();
    //                     if (authUserData && authUserData.created_at) {
    //                         realCreatedAt = authUserData.created_at;
    //                     }
    //                 }
    //             }
    //             if (realCreatedAt) {
    //                 fechaRegistroBase = new Date(realCreatedAt);
    //             }
    //         }
    //     } else if (rol === 'fisio' && userData.created_at) {
    //         fechaRegistroBase = new Date(userData.created_at);
    //     }
    // 
    //     plan = userData.plan_suscripcion || 'free'; // ACTUALIZAR PLAN TRAS LA HERENCIA
    // 
    //     if (plan === 'free' || plan === 'beta') {
    //         const hoy = new Date();
    //         if (userData.fecha_fin_prueba) {
    // ...
    //         } else {
    // const diasTranscurridos = Math.floor((hoy.getTime() - fechaRegistroBase.getTime()) / (1000 * 60 * 60 * 24));
    //             const diasTranscurridos = Math.floor((hoy.getTime() - fechaRegistroBase.getTime()) / (1000 * 60));
    //             if (diasTranscurridos > DIAS_DE_PRUEBA) cuentaBloqueada = true;
    //         }
    //     }
    // --- MODOS CON ACCESO TOTAL (Vitalicio, Lifetime o Pagado) ---
    //     else if (plan === 'lifetime' || plan === 'vitalicio' || plan === 'subscribed') {
    //         cuentaBloqueada = false; // ACCESO LIBRE, NO SE BLOQUEA NADA
    //     }
    // --- SUSCRIPCIÓN CANCELADA O IMPAGADA ---
    //     else if (plan === 'expired' || plan === 'inactive') {
    //         cuentaBloqueada = true;
    //     }
    // 
    // SI LA CUENTA ESTÁ BLOQUEADA MENSAJE CERROJO
    // if (cuentaBloqueada) {
    //     // AUTO-UPDATE DB EN LA WEB PARA MANTENER LA TABLA SINCRONIZADA
    //     if (rol === 'clinica') {
    //         supabaseClient.from('clinicas').update({ plan_suscripcion: 'expired' }).eq('user_id', currentUser.id).then();
    //         supabaseClient.from('fisios').update({ plan_suscripcion: 'expired' }).eq('clinica_id', userData.id).then();
    //     } else if (rol === 'fisio') {
    //         supabaseClient.from('fisios').update({ plan_suscripcion: 'expired' }).eq('user_id', currentUser.id).then();
    //     }
    // 
    //     // BLOQUEO VISUAL FUERTE
    //     // BORRAR PESTAÑAS Y DEJAR SOLO PERFIL
    //     const style = document.createElement('style');
    //     style.innerHTML = `
    //         .nav-item:not([data-tab="perfil"]) {
    //             display: none !important;
    //         }
    //     `;
    //     document.head.appendChild(style);
    // 
    //     // DESACTIVAR LA FUNCIÓN DEL CALENDARIO PARA QUE NO SE EJECUTE
    //     window.cargarCalendarioMes = function () { };
    // 
    //     // ELIMINAR TODAS LAS CLASES ACTIVE
    //     document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    //     document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    // 
    //     // FORZAR CLASE ACTIVE SOLO EN EL PERFIL
    //     const perfilNav = document.querySelector('.nav-item[data-tab="perfil"]');
    //     const perfilTab = document.getElementById('tab-perfil');
    //     if (perfilNav) perfilNav.classList.add('active');
    //     if (perfilTab) perfilTab.classList.add('active');
    //     const pageTitle = document.getElementById('pageTitle');
    //     if (pageTitle) pageTitle.textContent = "Mi Perfil";
    // 
    //     setTimeout(() => {
    //         alert("Tu periodo de acceso ha expirado. Por favor, renueva tu suscripción de forma segura con Stripe para desbloquear tu agenda y pacientes.");
    //     }, 100);
    // }
    // 
    // --- LÓGICA DE BLOQUEO WEB (FUNCIÓN) ---
    window.comprobarEstadoSuscripcion = async function () {
        let plan = userData.plan_suscripcion || 'free';
        let cuentaBloqueada = false;
        let fechaRegistroBase = new Date(currentUser.created_at);

        // 1. REFRESCO DE MEMORIA (El "Escudo" contra la desincronización)
        if (rol === 'clinica') {
            const { data: clinicaFresco } = await supabaseClient.from('clinicas').select('plan_suscripcion').eq('user_id', currentUser.id).single();
            if (clinicaFresco) userData.plan_suscripcion = clinicaFresco.plan_suscripcion;
        } else if (rol === 'fisio') {
            const { data: fisioFresco } = await supabaseClient.from('fisios').select('plan_suscripcion').eq('user_id', currentUser.id).single();
            if (fisioFresco) userData.plan_suscripcion = fisioFresco.plan_suscripcion;
        }

        // 2. HERENCIA DE LA CLÍNICA (Si eres Fisio empleado)
        if (rol === 'fisio' && userData.clinica_id) {
            const { data: clinicaAsociada } = await supabaseClient
                .from('clinicas')
                .select('plan_suscripcion, fecha_fin_prueba, created_at, user_id')
                .eq('id', userData.clinica_id)
                .single();

            if (clinicaAsociada) {
                const planFisioActual = (userData.plan_suscripcion || '').trim().toLowerCase();
                const planPadreClean = (clinicaAsociada.plan_suscripcion || '').trim().toLowerCase();
                if (planFisioActual !== planPadreClean) {
                    supabaseClient.from('fisios').update({ plan_suscripcion: planPadreClean }).eq('user_id', currentUser.id).then();
                }
                userData.plan_suscripcion = clinicaAsociada.plan_suscripcion;

                let realCreatedAt = clinicaAsociada.created_at;
                if (clinicaAsociada.user_id) {
                    const { data: perfilData } = await supabaseClient.from('gestion_perfil').select('created_at').eq('user_id', clinicaAsociada.user_id).single();
                    if (perfilData && perfilData.created_at) {
                        realCreatedAt = perfilData.created_at;
                    } else {
                        const { data: authUserData } = await supabaseClient.from('auth_user').select('created_at').eq('id_supabase', clinicaAsociada.user_id).single();
                        if (authUserData && authUserData.created_at) realCreatedAt = authUserData.created_at;
                    }
                }
                if (realCreatedAt) fechaRegistroBase = new Date(realCreatedAt);
            }
        } else if (rol === 'fisio' && userData.created_at) {
            fechaRegistroBase = new Date(userData.created_at);
        }

        plan = userData.plan_suscripcion || 'free';

        // ========================================================
        // 3. CÁLCULO MAESTRO DE TIEMPO (¡UNIFICADO AQUÍ!)
        // ========================================================
        const hoy = new Date();
        let fechaBaseTexto = fechaRegistroBase.toISOString();
        if (!fechaBaseTexto.includes('Z') && !fechaBaseTexto.includes('+')) fechaBaseTexto += 'Z';

        // ⚠️ IMPORTANTE PARA TUS PRUEBAS:
        // Ahora mismo está en minutos (1000 * 60). 
        // Cuando pases a producción cámbialo a días: (1000 * 60 * 60 * 24)
        const divisorTiempo = 1000 * 60;

        const unidadesTranscurridas = Math.max(0, Math.floor((hoy.getTime() - new Date(fechaBaseTexto).getTime()) / divisorTiempo));
        const unidadesRestantes = Math.max(0, DIAS_DE_PRUEBA - unidadesTranscurridas);

        // ========================================================
        // 4. LÓGICA DE BLOQUEO
        // ========================================================
        if (plan === 'free' || plan === 'beta') {
            if (unidadesTranscurridas > DIAS_DE_PRUEBA) cuentaBloqueada = true;
        } else if (plan === 'lifetime' || plan === 'vitalicio' || plan === 'subscribed') {
            cuentaBloqueada = false;
        } else if (plan === 'expired' || plan === 'inactive') {
            cuentaBloqueada = true;
        }

        // ========================================================
        // 5. EJECUCIÓN VISUAL (UI)
        // ========================================================
        if (cuentaBloqueada) {
            // (Bloqueo cerrojo)
            if (rol === 'clinica') {
                supabaseClient.from('clinicas').update({ plan_suscripcion: 'expired' }).eq('user_id', currentUser.id).then();
                supabaseClient.from('fisios').update({ plan_suscripcion: 'expired' }).eq('clinica_id', userData.id).then();
            } else if (rol === 'fisio') {
                supabaseClient.from('fisios').update({ plan_suscripcion: 'expired' }).eq('user_id', currentUser.id).then();
            }

            const style = document.createElement('style');
            style.innerHTML = `.nav-item:not([data-tab="perfil"]) { display: none !important; }`;
            document.head.appendChild(style);

            window.cargarCalendarioMes = function () { };

            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));

            const perfilNav = document.querySelector('.nav-item[data-tab="perfil"]');
            const perfilTab = document.getElementById('tab-perfil');
            if (perfilNav) perfilNav.classList.add('active');
            if (perfilTab) perfilTab.classList.add('active');

            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) pageTitle.textContent = "Mi Perfil";

            if (!document.getElementById('bloqueoNotificado')) {
                const marker = document.createElement('div');
                marker.id = 'bloqueoNotificado';
                document.body.appendChild(marker);
                setTimeout(() => alert("Tu periodo de acceso ha expirado. Por favor, renueva tu suscripción."), 100);
            }
        }
        else if (!cuentaBloqueada && document.getElementById('bloqueoNotificado')) {
            // AUTO-DESBLOQUEO
            window.location.reload();
        }
        else if (!cuentaBloqueada && (plan === 'free' || plan === 'beta')) {
            // ACTUALIZACIÓN VISUAL DEL BANNER LATERAL
            const banner = document.getElementById('license-banner');
            const bannerText = document.getElementById('license-banner-text');
            const bannerIcon = document.getElementById('license-banner-icon');

            if (banner && bannerText && bannerIcon) {
                banner.style.display = 'block';
                if (unidadesRestantes <= 10) {
                    banner.style.backgroundColor = '#FEF2F2';
                    banner.style.borderColor = '#FCA5A5';
                    bannerIcon.style.color = 'var(--danger)';
                    bannerIcon.className = 'fa-solid fa-triangle-exclamation';
                    // ⚠️ Recuerda cambiar la palabra "minutos" a "días" para producción
                    bannerText.innerHTML = `<strong>⚠️ ¡Aviso Urgente!</strong><br>Quedan ${unidadesRestantes} minutos de prueba.`;
                } else {
                    // ⚠️ Recuerda cambiar la palabra "minutos" a "días" para producción
                    bannerText.innerHTML = `<strong>Periodo de prueba</strong><br>Quedan ${unidadesRestantes} minutos.`;
                }
            }

            // MODALES PROMOCIONALES
            const HITOS_AVISO = [0, 30, 60, 90];
            let hitoActual = -1;
            for (const hito of HITOS_AVISO) {
                if (unidadesTranscurridas >= hito) hitoActual = hito;
            }
            if (hitoActual !== -1) {
                const storageKey = `web_modal_licencia_${currentUser.id}_hito_${hitoActual}`;
                const yaMostrado = localStorage.getItem(storageKey);

                if (!yaMostrado) {
                    if (typeof mostrarModalWeb === 'function') {
                        mostrarModalWeb(hitoActual, unidadesRestantes);
                    }
                    localStorage.setItem(storageKey, 'true');
                }
            }
        }
    };

    await window.comprobarEstadoSuscripcion();

    // CARGAR PERFIL DE FORMA ASÍNCRONA PARA QUE NO HAYA PARPADEOS
    await cargarPerfil(currentUser.id, userData, currentUser.email, rol);

    if (rol === 'clinica') {
        window.cargarFisiosAsociados();
    }

    // INICIALIZAR PESTAÑA ACTIVA POR DEFECTO, CALENDARIO
    const activeTabItem = document.querySelector('.nav-item.active');
    if (activeTabItem) {
        document.getElementById('pageTitle').textContent = activeTabItem.textContent.trim();
        const target = activeTabItem.getAttribute('data-tab');
        if (target === 'calendario' && window.cargarCalendarioMes) window.cargarCalendarioMes();
    }

    // MANEJAR PESTAÑAS
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // REMOVER ACTIVE DE TODOS
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(tab => tab.classList.remove('active'));

            // AÑADIR ACTIVE A CLICKEADO
            item.classList.add('active');
            const target = item.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');

            // ACTUALIZAR TÍTULO
            pageTitle.textContent = item.textContent.trim();

            // DISPARAR EVENTOS Y RECARGAR SI ES NECESARIO
            if (target === 'calendario' && window.cargarCalendarioMes) window.cargarCalendarioMes();
            if (target === 'pacientes' && window.cargarPacientes) window.cargarPacientes();
        });
    });

    // CERRAR SESIÓN
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut({ scope: 'local' });
        window.location.href = 'login.html';
    });
});

async function cargarPerfil(userId, userDataBase, authEmail, rol) {
    // OBTENER DATOS DE AUTH_USER PARA EL NOMBRRE, MAIL Y FOTO
    const { data: userData } = await supabaseClient
        .from('auth_user')
        .select('username, email, foto_perfil_url')
        .eq('id_supabase', userId)
        .single();

    const nombre = userData && userData.username ? userData.username : (userDataBase.nombre || 'Fisioterapeuta');
    const email = userData && userData.email ? userData.email : authEmail;
    const foto = (userData && userData.foto_perfil_url) ? userData.foto_perfil_url : (userDataBase.foto_perfil_url || userDataBase.foto_url || null);

    const clinicaId = userDataBase.clinica_id || null;

    // GUARDAR EN MEMORIA PARA ACTUALIZAR LUEGO
    window.currentProfileData = {
        userId: userId,
        clinicaDataId: userDataBase.id,
        clinica_id: userDataBase.clinica_id || null,
        rol: rol,
        nombre: nombre,
        email: email,
        foto: foto,
        num_colegiado: userDataBase.num_colegiado || '',
        redes_sociales: userDataBase.redes_sociales || '',
        especialidades: userDataBase.especialidad ? userDataBase.especialidad.split(',').map(s => s.trim()).filter(Boolean) : [],
        plan_suscripcion: userDataBase.plan_suscripcion || 'free' // GUARDAR PLAN
    };

    renderizarPerfilInfo();
    configurarPagosStripe(userId, email); // ACTIVAR LÓGICA DEL COBRO

    // EVENT LISTENERS DE LA PESTAÑA PERFIL
    document.getElementById('addSpecialtyBtn').onclick = () => {
        const input = document.getElementById('newSpecialtyInput');
        const val = input.value.trim();
        if (val && !window.currentProfileData.especialidades.includes(val)) {
            window.currentProfileData.especialidades.push(val);
            renderSpecialties();
            input.value = '';
        }
    };

    document.getElementById('profileForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveProfileBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Actualizando...';

        try {
            const newName = document.getElementById('profName').value.trim();
            const newCol = document.getElementById('profColegiado').value.trim();
            const newRedes = document.getElementById('profRedes').value.trim();
            const specString = window.currentProfileData.especialidades.join(', ');

            // Comprobar contraseña
            const newPwdElem = document.getElementById('profPassword');
            if (newPwdElem && newPwdElem.value) {
                const newPwd = newPwdElem.value;
                if (newPwd.length < 6) {
                    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
                }
                const { error: pwdError } = await supabaseClient.auth.updateUser({ password: newPwd });
                if (pwdError) throw new Error("No se pudo actualizar la contraseña: " + pwdError.message);
                newPwdElem.value = '';
            }

            // ACTUALIZAR AUTH_USER
            await supabaseClient.from('auth_user')
                .update({ username: newName })
                .eq('id_supabase', userId);

            // ACTUALIZAR TABLA CORRESPONDIENTE
            const tableName = window.currentProfileData.rol === 'clinica' ? 'clinicas' : 'fisios';
            await supabaseClient.from(tableName)
                .update({
                    nombre: newName,
                    num_colegiado: newCol,
                    redes_sociales: newRedes,
                    especialidad: specString
                })
                .eq('user_id', userId);

            window.currentProfileData.nombre = newName;
            renderizarPerfilInfo();
            alert('Perfil actualizado correctamente.');

        } catch (error) {
            console.error(error);
            alert('Error al actualizar el perfil.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Actualizar Perfil';
        }
    };
}

// AÑADIMOS LA CONFIGURACIÓN DE STRIPE ARRIBA DE LA FUNCIÓN
const STRIPE_CONFIG = {
    FISIO_AUTONOMO: {
        priceId: 'price_1TiYRU7mdAjWsY6xnQ8pYN0W', // 12,95€
        precioTexto: '12,95€'
    },
    CLINICA: {
        priceId: 'price_1TlQFx7mdAjWsY6xGJpqKgzT', // 9,95€
        precioTexto: '9,95€'
    }
};

function configurarPagosStripe(userId, email) {
    const checkoutBtn = document.getElementById('stripeCheckoutBtn');
    const secureText = document.getElementById('stripeSecureText');
    const statusText = document.getElementById('subscriptionStatusText');
    const plan = window.currentProfileData.plan_suscripcion;
    const rol = window.currentProfileData.rol;
    const clinicaId = window.currentProfileData.clinica_id; // SABER SI TIENE "JEFE"

    if (!checkoutBtn || !statusText) return;

    // ESTADO VISUAL: BETA O PAGADO
    if (plan === 'beta' || plan === 'lifetime') {
        statusText.innerText = "Acceso Vitalicio (Fundador/Beta)";
        statusText.style.color = "#10B981"; // Verde
        checkoutBtn.style.display = 'none';
        secureText.style.display = 'none';
        return;
    } else if (plan === 'subscribed') {
        statusText.innerText = "Suscripción Premium Activa";
        statusText.style.color = "#10B981";
        checkoutBtn.style.display = 'none';
        secureText.style.display = 'none';
        return;
    }

    // ESTADO VISUAL: FREE O EXPIRED
    // CASO A: SI ES FISIO DE UNA CLÍNICA LA CLÍNICA PAGA POR ÉL
    if (rol === 'fisio' && clinicaId) {
        statusText.innerText = "Suscripción gestionada por tu Clínica";
        statusText.style.color = "#64748b";
        checkoutBtn.style.display = 'none'; // QUITAR BOTÓN PAGO AL EMPLEADO
        secureText.style.display = 'none';
        return;
    }

    // CASO B: SI ES ClÍNICA O FISIO LIBRE TIENE QUE PAGAR
    statusText.innerText = "Versión de Prueba Gratuita";
    statusText.style.color = "#D97706";
    checkoutBtn.style.display = 'block';
    secureText.style.display = 'block';

    // DECIDIR CONFIGURACIÓN USANDO EL OBJETO
    const config = (rol === 'clinica') ? STRIPE_CONFIG.CLINICA : STRIPE_CONFIG.FISIO_AUTONOMO;

    // APLICAR PRECIO DINÁMICO Y GUARDAR EL ID
    checkoutBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Suscribirse (${config.precioTexto}/mes)`;
    checkoutBtn.dataset.priceId = config.priceId;

    // CONTROL DEL CLICK UNIFICADO
    if (!checkoutBtn.dataset.listenerAttached) {
        checkoutBtn.dataset.listenerAttached = 'true';

        checkoutBtn.addEventListener('click', async () => {
            const textoOriginal = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando con el banco...';
            checkoutBtn.disabled = true;

            try {
                let cantidadFisios = 1;

                // SI ES CLÍNICA CONTAR CUANTOS FISIOS TIENE
                if (rol === 'clinica') {
                    const { count } = await supabaseClient
                        .from('fisios')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinica_id', window.currentProfileData.clinicaDataId);

                    if (count && count > 0) cantidadFisios = count;
                }

                // LLAMADA ÚNICA A SUPABASE USANDO EL PRICEID DE ARRIBA
                const { data, error } = await supabaseClient.functions.invoke('crear-checkout-stripe', {
                    body: {
                        priceId: checkoutBtn.dataset.priceId,
                        userId: userId,
                        email: email,
                        quantity: cantidadFisios
                    }
                });

                if (error) throw error;
                if (data && data.url) window.location.href = data.url;

            } catch (error) {
                console.error('Error al procesar pago:', error);
                alert('No se pudo conectar con la pasarela de pago. Inténtalo de nuevo más tarde.');
                checkoutBtn.innerHTML = textoOriginal;
                checkoutBtn.disabled = false;
            }
        });
    }
}

function renderizarPerfilInfo() {
    const data = window.currentProfileData;

    // Header
    document.getElementById('userNameHeader').textContent = data.nombre;

    // Formulario
    document.getElementById('profileTitleName').textContent = data.nombre;
    document.getElementById('profName').value = data.nombre;
    document.getElementById('profEmail').value = data.email;
    document.getElementById('profColegiado').value = data.num_colegiado;
    document.getElementById('profRedes').value = data.redes_sociales;

    const divColegiado = document.getElementById('profColegiado').closest('.form-group');
    const divEspecialidades = document.getElementById('specialtiesContainer').closest('.form-group');
    // const panelTitulo = document.querySelector('h4:contains("Panel de Fisioterapeuta")');

    if (data.rol === 'clinica') {
        if (divColegiado) divColegiado.style.display = 'none';

        // OCULTAR ESPECIALIDADES DE LA CLÍNICA
        if (divEspecialidades) divEspecialidades.style.display = 'none';

        // CAMBIAR TÍTULO SEGÚN SEA CLÍNICA O FISIO
        const headings = document.querySelectorAll('h4');
        headings.forEach(h4 => {
            if (h4.textContent.includes('Panel de Fisioterapeuta')) {
                h4.textContent = 'Información de la Clínica';
            }
        });
        document.getElementById('profileTitleRole').textContent = "Clínica";
    } else {
        if (divColegiado) divColegiado.style.display = 'block';
        if (divEspecialidades) divEspecialidades.style.display = 'block';
        document.getElementById('profileTitleRole').textContent = "Fisioterapeuta";
    }

    // AVATARES
    const avatares = [document.getElementById('userAvatarHeader'), document.getElementById('profileAvatarBig')];
    avatares.forEach(el => {
        if (data.foto) {
            el.innerHTML = `<img src="${data.foto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover">`;
        } else {
            el.textContent = data.nombre.charAt(0).toUpperCase();
        }
    });

    renderSpecialties();
}

function renderSpecialties() {
    const container = document.getElementById('specialtiesContainer');
    container.innerHTML = '';
    window.currentProfileData.especialidades.forEach((esp, index) => {
        const tag = document.createElement('div');
        tag.style.cssText = "display: flex; align-items: center; background: #EBF2EA; padding: 6px 12px; border-radius: 20px; border: 1px solid #DDE5DC; color: var(--primary); font-weight: 600; font-size: 14px;";

        const txt = document.createElement('span');
        txt.textContent = esp;

        const removeBtn = document.createElement('i');
        removeBtn.className = "fa-solid fa-circle-xmark";
        removeBtn.style.cssText = "margin-left: 8px; cursor: pointer;";
        removeBtn.onclick = () => {
            window.currentProfileData.especialidades.splice(index, 1);
            renderSpecialties();
        };

        tag.appendChild(txt);
        tag.appendChild(removeBtn);
        container.appendChild(tag);
    });
}

// -------------------------------------------------------------
// LÓGICA DE CLÍNICAS (Fisios Asociados)
// -------------------------------------------------------------
window.cargarFisiosAsociados = async function () {
    if (!currentUser || window.currentProfileData.rol !== 'clinica') return;

    const lista = document.getElementById('listaFisiosClinica');
    if (!lista) return;

    lista.innerHTML = '<div class="loading-spinner">Cargando fisios...</div>';

    const { data: fisios, error } = await supabaseClient
        .from('fisios')
        .select('*')
        .eq('clinica_id', window.currentProfileData.clinicaDataId);

    if (error) {
        lista.innerHTML = '<p class="text-danger">Error al cargar fisios asociados.</p>';
        return;
    }

    // Actualizar el selector de fisios en el modal de nuevo horario si existe
    const select = document.getElementById('sessionFisioSelect');
    if (select) {
        select.innerHTML = fisios.map(f => `<option value="${f.user_id}">${f.nombre}</option>`).join('');
        document.getElementById('groupSelectFisio').style.display = 'block';
    }

    if (!fisios || fisios.length === 0) {
        lista.innerHTML = '<p class="text-light">Aún no tienes fisioterapeutas asociados. Haz clic en "Añadir Fisio" para empezar.</p>';
        return;
    }

    lista.innerHTML = fisios.map(f => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 0;">
            <div style="display: flex; align-items: center; gap: 15px; cursor: pointer; flex: 1;" onclick="abrirDetalleFisio('${f.user_id}')">
                <div class="avatar-mini">
                    ${f.foto_perfil_url || f.foto_url ? `<img src="${f.foto_perfil_url || f.foto_url}">` : f.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                    <strong style="display: block;">${f.nombre}</strong>
                    <span style="font-size: 0.85rem; color: #666;">${f.email}</span>
                </div>
            </div>
            <button class="icon-btn text-danger" onclick="eliminarFisioAsociado('${f.user_id}')" title="Desvincular" style="background: #fee2e2;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
};

window.abrirDetalleFisio = async function (fisioId) {
    try {
        const modal = document.getElementById('modalDetalleFisio');

        // CARGAR DATOS BÁSICOS DE FISIO Y AUTH_USER
        const { data: authData } = await supabaseClient
            .from('auth_user')
            .select('telefono')
            .eq('id_supabase', fisioId)
            .single();

        const { data: fisio, error: fisioError } = await supabaseClient
            .from('fisios')
            .select('nombre, email, foto_perfil_url, foto_url')
            .eq('user_id', fisioId)
            .single();

        if (fisioError) throw fisioError;

        const telefonoFisio = authData?.telefono || 'Sin teléfono';

        // MOSTRAR EN UI
        document.getElementById('dfName').innerText = fisio.nombre || 'Fisioterapeuta';
        document.getElementById('dfEmail').innerText = fisio.email || 'correo@ejemplo.com';
        document.getElementById('dfPhone').innerHTML = '<i class="fa-solid fa-phone"></i> <span>' + telefonoFisio + '</span>';

        const avatarBox = document.getElementById('dfAvatar');
        const imgUrl = fisio.foto_perfil_url || fisio.foto_url;
        if (imgUrl) {
            avatarBox.innerHTML = `<img src="${imgUrl}" style="width:100%; height:100%; border-radius:50%; object-fit: cover;">`;
            avatarBox.style.background = 'transparent';
            avatarBox.style.border = '2px solid var(--secondary)';
        } else {
            avatarBox.innerHTML = fisio.nombre.charAt(0).toUpperCase();
            avatarBox.style.background = 'var(--primary)';
        }

        // OBTENER CITAS, HORARIOS DISPONIBLES
        const { data: citas, error: citasError } = await supabaseClient
            .from('horarios_disponibles')
            .select('dia, hora')
            .eq('fisio_id', fisioId)
            .eq('estado', 'reservado');

        if (!citasError && citas) {
            const hoy = new Date();
            let terminadas = 0;
            let proximas = 0;

            citas.forEach(c => {
                const fechaCita = new Date(`${c.dia}T${c.hora}:00`);
                if (fechaCita < hoy) terminadas++;
                else proximas++;
            });

            document.getElementById('dfTerminadas').innerText = terminadas;
            document.getElementById('dfProximas').innerText = proximas;
        }

        // CONFIGURAR BOTÓN RESET PASSWORD
        const btnReset = document.getElementById('dfResetPwdBtn');
        btnReset.onclick = async () => {
            if (!confirm(`¿Enviar email de recuperación a ${fisio.email}?`)) return;
            btnReset.disabled = true;
            const { error } = await supabaseClient.auth.resetPasswordForEmail(fisio.email);
            btnReset.disabled = false;
            if (error) alert("Error enviando email: " + error.message);
            else alert("Email de recuperación enviado correctamente a " + fisio.email);
        };

        modal.classList.add('active');
    } catch (err) {
        console.error(err);
        alert("No se pudieron cargar los datos del fisio.");
    }
};
window.eliminarFisioAsociado = async function (fisioId) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este fisioterapeuta? Se borrarán permanentemente sus citas y pacientes asociados a la clínica.')) return;

    try {
        // 1. BORRAR CITAS
        await supabaseClient.from('horarios_disponibles').delete().eq('fisio_id', fisioId);
        // 2. BORRAR PACIENTES
        await supabaseClient.from('mis_pacientes').delete().eq('fisio_id', fisioId);
        // 3. BORRAR PERFIL DE FISIO
        await supabaseClient.from('fisios').delete().eq('user_id', fisioId);
        // 4. BORRAR CONTROL DE PERFIL
        await supabaseClient.from('gestion_perfil').delete().eq('user_id', fisioId);
        // 5. BORRADO TOTAL DE AUTHENTICATION (Nueva línea)
        const { error } = await supabaseClient.rpc('eliminar_fisio_auth', { fisio_uid: fisioId });

        if (error) throw error;

        alert('El fisioterapeuta y sus datos han sido eliminados.');
        window.cargarFisiosAsociados();
    } catch (err) {
        console.error(err);
        alert('Error al intentar eliminar al fisioterapeuta.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const addFisioModalBtn = document.getElementById('addFisioModalBtn');
    if (addFisioModalBtn) {
        addFisioModalBtn.addEventListener('click', () => {
            document.getElementById('modalAddFisio').classList.add('active');
        });
    }

    const submitAddFisioBtn = document.getElementById('submitAddFisioBtn');
    if (submitAddFisioBtn) {
        submitAddFisioBtn.addEventListener('click', async () => {
            const name = document.getElementById('addFisioName').value.trim();
            const email = document.getElementById('addFisioEmail').value.trim();
            const rawPhone = document.getElementById('addFisioPhone').value.trim();
            const prefijo = document.getElementById('fisio-prefix').innerText;
            const phone = prefijo + rawPhone;
            const pwd = document.getElementById('addFisioPwd').value;
            const adminPwd = document.getElementById('addFisioAdminPwd').value;

            if (!name || !email || !pwd || !adminPwd) {
                return alert("Rellena los campos obligatorios.");
            }

            submitAddFisioBtn.disabled = true;
            submitAddFisioBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';

            try {
                // 1. Verificar credenciales del Admin (Clínica)
                const adminEmail = currentUser.email;
                const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                    email: adminEmail,
                    password: adminPwd
                });

                if (signInError) {
                    throw new Error("La contraseña de la clínica es incorrecta.");
                }

                // 2. Crear al nuevo usuario
                const { data: newUserObj, error: signUpError } = await supabaseClient.auth.signUp({
                    email: email,
                    password: pwd,
                    options: {
                        data: { full_name: name, telefono: phone }
                    }
                });

                if (signUpError) throw signUpError;
                const newUserId = newUserObj.user.id;

                // 3. Crear el perfil en 'fisios'
                const { error: insertFisioError } = await supabaseClient
                    .from('fisios')
                    .insert([{
                        user_id: newUserId,
                        clinica_id: window.currentProfileData.clinicaDataId,
                        nombre: name,
                        email: email,
                        telefono: phone
                    }]);

                if (insertFisioError) throw insertFisioError;

                // 4. Crear el perfil en 'gestion_perfil' (Actualizamos porque el trigger de BD ya lo crea por defecto)
                const { error: gestionError } = await supabaseClient
                    .from('gestion_perfil')
                    .update({ rol: 'fisio' })
                    .eq('user_id', newUserId);

                if (gestionError) throw gestionError;

                // 5. Actualizar el perfil en 'auth_user'
                const { error: authUserError } = await supabaseClient
                    .from('auth_user')
                    .update({
                        email: email,
                        username: name,
                        telefono: phone
                    })
                    .eq('id_supabase', newUserId);

                if (authUserError) throw authUserError;

                // 6. Restaurar la sesión de la clínica
                await supabaseClient.auth.signInWithPassword({
                    email: adminEmail,
                    password: adminPwd
                });

                alert("¡Fisioterapeuta registrado y vinculado correctamente!");
                document.getElementById('modalAddFisio').classList.remove('active');

                // Limpiar campos
                document.getElementById('addFisioName').value = '';
                document.getElementById('addFisioEmail').value = '';
                document.getElementById('addFisioPhone').value = '';
                document.getElementById('addFisioPwd').value = '';
                document.getElementById('addFisioAdminPwd').value = '';

                window.cargarFisiosAsociados();

            } catch (err) {
                console.error(err);
                alert("Error: " + err.message);
            } finally {
                submitAddFisioBtn.disabled = false;
                submitAddFisioBtn.innerHTML = 'Registrar Fisio';
            }
        });
    }
});

// ==========================================
// FUNCIÓN PARA PINTAR EL MODAL DE LICENCIA
// ==========================================
function mostrarModalWeb(hito, diasRestantes) {
    const modal = document.getElementById('license-modal');
    if (!modal) return; // Por si acaso no existe el HTML

    const title = document.getElementById('license-modal-title');
    const body = document.getElementById('license-modal-body');
    const iconBg = document.getElementById('license-modal-icon-bg');
    const icon = document.getElementById('license-modal-icon');

    switch (hito) {
        case 0:
            title.innerText = 'Prueba de 100 días activada';
            body.innerText = 'Bienvenido al panel web. Hemos activado tu licencia con acceso a todas las funciones. No necesitas tarjeta de crédito. Cuando termine el plazo, podrás elegir uno de nuestros planes desde la pestaña "Mi Perfil".';
            iconBg.style.backgroundColor = 'var(--primary)';
            icon.className = 'fa-solid fa-rocket';
            break;
        case 30:
            title.innerText = 'Periodo de prueba activo';
            body.innerText = `Llevas un mes usando Fysium. Te quedan ${diasRestantes} días de prueba gratuita. Recuerda que puedes suscribirte a un plan profesional en cualquier momento desde tu perfil.`;
            iconBg.style.backgroundColor = 'var(--primary)';
            icon.className = 'fa-solid fa-clock';
            break;
        case 60:
            title.innerText = `Tu prueba expira en ${diasRestantes} días`;
            body.innerText = 'Ya has completado más de la mitad de tu periodo de pruebas. Te recomendamos elegir tu plan de suscripción definitivo antes de que finalice el plazo para no interrumpir el servicio de reservas de tus pacientes.';
            iconBg.style.backgroundColor = '#D97706'; // Naranja
            icon.className = 'fa-solid fa-bell';
            break;
        case 90:
            title.innerText = `⚠️ Acción requerida: Termina en ${diasRestantes} días`;
            body.innerText = 'Tu acceso gratuito está a punto de caducar. Configura tu método de pago y activa tu licencia profesional en la pestaña "Mi Perfil" ahora mismo para garantizar un servicio ininterrumpido a tus pacientes.';
            iconBg.style.backgroundColor = 'var(--danger)';
            icon.className = 'fa-solid fa-triangle-exclamation';
            break;
    }

    modal.classList.add('active');
}

setInterval(() => {
    if (typeof window.comprobarEstadoSuscripcion === 'function') {
        window.comprobarEstadoSuscripcion();
    }
}, 60000);