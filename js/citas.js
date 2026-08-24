// ==========================================
// LÓGICA DE TODAS LAS CITAS (PESTAÑA CITAS)
// ==========================================
window.cargarTodasLasCitas = async function () {
  const lista = document.getElementById('listaTodasLasCitas');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-spinner">Cargando citas...</div>';
  try {
    let listaIdsFisios = [currentUser.id];
    let mapFisios = {};
    // 1. Si es clínica, buscar todos sus fisios
    if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
      const { data: fisiosData } = await supabaseClient
        .from('fisios')
        .select('user_id, nombre')
        .eq('clinica_id', window.currentProfileData.clinicaDataId);
      if (fisiosData && fisiosData.length > 0) {
        listaIdsFisios = fisiosData.map(f => f.user_id);
        fisiosData.forEach(f => mapFisios[f.user_id] = f.nombre);
      }
    }
    // 2. Obtener citas (solo las reservadas) ordenadas por fecha descendente
    const { data: citas, error } = await supabaseClient
      .from('horarios_disponibles')
      .select('*')
      .in('fisio_id', listaIdsFisios)
      .eq('estado', 'reservado')
      .order('dia', { ascending: false })
      .order('hora', { ascending: false });
    if (error) throw error;
    if (!citas || citas.length === 0) {
      lista.innerHTML = '<p class="text-light text-center" style="margin-top: 20px;">No hay citas reservadas todavía.</p>';
      return;
    }
    // 3. Obtener nombres de los pacientes (si son pacientes de la app)
    const clienteIds = [...new Set(citas.map(c => c.cliente_id).filter(Boolean))];
    let mapPacientes = {};
    if (clienteIds.length > 0) {
      const { data: users } = await supabaseClient
        .from('auth_user')
        .select('id_supabase, username')
        .in('id_supabase', clienteIds);

      if (users) {
        users.forEach(u => mapPacientes[u.id_supabase] = u.username);
      }
    }
    // 4. Preparar datos finales
    window.todasLasCitasCargadas = citas.map(cita => {
      const nombrePaciente = cita.nombre_paciente || mapPacientes[cita.cliente_id] || 'Paciente Desconocido';
      const nombreFisio = mapFisios[cita.fisio_id] || 'Mi Agenda';

      return {
        ...cita,
        nombrePacienteFinal: nombrePaciente,
        nombreFisioFinal: nombreFisio
      };
    });
    window.renderizarListaCitas(window.todasLasCitasCargadas);
  } catch (err) {
    console.error("Error cargando todas las citas:", err);
    lista.innerHTML = '<p class="text-danger text-center">Error al cargar las citas.</p>';
  }
};
window.renderizarListaCitas = function (citasArray) {
  const lista = document.getElementById('listaTodasLasCitas');
  if (!lista) return;
  if (citasArray.length === 0) {
    lista.innerHTML = '<p class="text-light text-center" style="margin-top: 20px;">No se encontraron citas.</p>';
    return;
  }
  const html = citasArray.map(cita => {
    const fechaInvertida = cita.dia.split('-').reverse().join('/');

    // Etiqueta del fisio (solo útil si es clínica y tiene fisios)
    let fisioBadge = '';
    if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
      fisioBadge = `<div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;"><i class="fa-solid fa-user-doctor"></i> Fisio Asociado: ${cita.nombreFisioFinal}</div>`;
    }
    return `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 0; border-left: 4px solid var(--primary);">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-dark);">${cita.nombrePacienteFinal}</h3>
                    <div style="font-size: 0.9rem; color: var(--primary); font-weight: 600; margin-top: 5px;">
                        <i class="fa-regular fa-calendar"></i> ${fechaInvertida} &nbsp;&nbsp;
                        <i class="fa-regular fa-clock"></i> ${cita.hora}
                    </div>
                    ${fisioBadge}
                </div>
                <div style="text-align: right;">
                    <span style="background-color: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                        Reservado
                    </span>
                    <div style="margin-top: 8px; font-size: 0.9rem; color: #666; font-weight: bold;">
                        ${cita.precio > 0 ? cita.precio + '€' : ''}
                    </div>
                </div>
            </div>
        `;
  }).join('');
  lista.innerHTML = html;
};
window.filtrarCitasWeb = function () {
  const input = document.getElementById('buscadorCitas');
  if (!input || !window.todasLasCitasCargadas) return;
  const texto = input.value.toLowerCase();

  const citasFiltradas = window.todasLasCitasCargadas.filter(cita => {
    const pacienteMatch = cita.nombrePacienteFinal.toLowerCase().includes(texto);
    const fisioMatch = cita.nombreFisioFinal.toLowerCase().includes(texto);
    return pacienteMatch || fisioMatch;
  });
  window.renderizarListaCitas(citasFiltradas);
};