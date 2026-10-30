// ==========================================
// VISTA GLOBAL DEL MES (PANTALLA COMPLETA)
// ==========================================
let globalMonth = new Date();
let globalAppointments = [];
let globalFisiosMap = {};

function formatearFechaISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

window.cargarCitasGlobal = async function () {
  // 1. Asegurar sesión activa
  if (!currentUser) {
    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) currentUser = data.session.user;
  }
  if (!currentUser) return;
  // 2. Colocar título de mes de inmediato (adiós "Cargando...")
  const title = document.getElementById('globalMonthTitle');
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  if (title) title.textContent = `${monthNames[globalMonth.getMonth()]} ${globalMonth.getFullYear()}`;
  let listaIdsFisios = [currentUser.id];
  globalFisiosMap = {};
  const selectFisio = document.getElementById('globalFisioFilter');
  // 3. SOLO SI ES CLÍNICA: mostramos el filtro y cargamos a sus profesionales
  if (window.currentProfileData && window.currentProfileData.rol === 'clinica') {
    const { data: fisiosData } = await supabaseClient
      .from('fisios')
      .select('user_id, nombre')
      .eq('clinica_id', window.currentProfileData.clinicaDataId);
    if (fisiosData && fisiosData.length > 0) {
      listaIdsFisios = fisiosData.map(f => f.user_id);
      fisiosData.forEach(f => { globalFisiosMap[f.user_id] = f.nombre; });
      if (selectFisio) {
        selectFisio.style.display = 'inline-block'; // Se muestra SOLO en centros
        if (selectFisio.options.length <= 1) {
          fisiosData.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.user_id;
            opt.textContent = `🩺 ${f.nombre}`;
            selectFisio.appendChild(opt);
          });
        }
      }
    }
  } else {
    // PROFESIONAL INDEPENDIENTE: Filtro 100% oculto
    if (selectFisio) selectFisio.style.display = 'none';
  }
  // 4. Consultar citas del mes completo
  const startOfMonth = new Date(globalMonth.getFullYear(), globalMonth.getMonth(), 1);
  const endOfMonth = new Date(globalMonth.getFullYear(), globalMonth.getMonth() + 1, 0);
  const { data, error } = await supabaseClient
    .from('horarios_disponibles')
    .select('*')
    .in('fisio_id', listaIdsFisios)
    .gte('dia', formatearFechaISO(startOfMonth))
    .lte('dia', formatearFechaISO(endOfMonth))
    .neq('estado', 'cancelado')
    .order('hora', { ascending: true });

  if (!error && data) {
    data.forEach(c => {
      c.nombre_fisio = globalFisiosMap[c.fisio_id] || 'Mi Agenda';
    });

    // Traer nombres de pacientes de auth_user si no vienen directos
    const clienteIds = [...new Set(data.filter(c => c.cliente_id && !c.nombre_paciente).map(c => c.cliente_id))];
    if (clienteIds.length > 0) {
      const { data: users } = await supabaseClient.from('auth_user').select('id_supabase, username').in('id_supabase', clienteIds);
      if (users) {
        data.forEach(c => {
          if (c.cliente_id && !c.nombre_paciente) {
            const u = users.find(u => u.id_supabase === c.cliente_id);
            if (u) c.nombre_paciente = u.username;
          }
        });
      }
    }
    globalAppointments = data;
  } else {
    globalAppointments = [];
  }

  renderizarCitasGlobal();
};

function renderizarCitasGlobal() {
  const grid = document.getElementById('globalMonthGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const fisioFiltro = document.getElementById('globalFisioFilter')?.value || 'todos';
  const estadoFiltro = document.getElementById('globalEstadoFilter')?.value || 'todos';

  // Aplicar filtros
  let citasFiltradas = globalAppointments.filter(c => {
    const matchFisio = (fisioFiltro === 'todos') || (c.fisio_id === fisioFiltro);
    const matchEstado = (estadoFiltro === 'todos') || (c.estado === estadoFiltro);
    return matchFisio && matchEstado;
  });

  // Actualizar contador
  const countTotal = citasFiltradas.length;
  const countReservadas = citasFiltradas.filter(c => c.estado === 'reservado').length;
  const countLibres = citasFiltradas.filter(c => c.estado === 'libre').length;
  const countEl = document.getElementById('globalSummaryCount');
  if (countEl) {
    countEl.textContent = `${countTotal} sesiones (${countReservadas} reservadas · ${countLibres} libres)`;
  }

  const firstDay = new Date(globalMonth.getFullYear(), globalMonth.getMonth(), 1);
  const lastDay = new Date(globalMonth.getFullYear(), globalMonth.getMonth() + 1, 0);

  // Ajustar Lunes = 0
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  // Celdas vacías antes del primer día del mes
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'background: #F8FAFC; min-height: 125px; opacity: 0.5;';
    grid.appendChild(emptyCell);
  }

  const hoyStr = formatearFechaISO(new Date());

  // Generar días del mes
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const fechaIteracion = new Date(globalMonth.getFullYear(), globalMonth.getMonth(), d);
    const diaStr = formatearFechaISO(fechaIteracion);
    const esHoy = (diaStr === hoyStr);

    const cell = document.createElement('div');
    cell.style.cssText = `background: #FFFFFF; min-height: 125px; max-height: 175px; display: flex; flex-direction: column; padding: 6px; box-sizing: border-box; ${esHoy ? 'border-top: 3px solid var(--primary);' : ''}`;

    // Cabecera del día
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

    const dayNum = document.createElement('span');
    dayNum.textContent = d;
    dayNum.style.cssText = esHoy
      ? 'background: var(--primary); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 700;'
      : 'font-size: 0.82rem; font-weight: 700; color: #475569;';

    header.appendChild(dayNum);

    const citasDelDia = citasFiltradas.filter(c => c.dia === diaStr);
    citasDelDia.sort((a, b) => a.hora.localeCompare(b.hora));

    if (citasDelDia.length > 0) {
      const badgeCount = document.createElement('span');
      badgeCount.textContent = `${citasDelDia.length} citas`;
      badgeCount.style.cssText = 'font-size: 0.68rem; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 1px 6px; border-radius: 10px;';
      header.appendChild(badgeCount);
    }

    cell.appendChild(header);

    // Lista interna scrolleable de citas
    const sessionsBox = document.createElement('div');
    sessionsBox.style.cssText = 'display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1; padding-right: 2px;';

    citasDelDia.forEach(cita => {
      const pill = document.createElement('div');
      const esReservado = (cita.estado === 'reservado');
      const esPausado = (cita.estado === 'pausado');

      let bg = '#ECFDF5';
      let border = '#10B981';
      let text = '#065F46';

      if (esReservado) {
        bg = '#E0F2FE';
        border = '#0284C7';
        text = '#0369A1';
      } else if (esPausado) {
        bg = '#FEF3C7';
        border = '#F59E0B';
        text = '#92400E';
      }

      pill.style.cssText = `background: ${bg}; border-left: 3px solid ${border}; color: ${text}; padding: 3px 6px; border-radius: 6px; font-size: 0.72rem; line-height: 1.25; cursor: pointer; transition: transform 0.15s;`;
      pill.title = "Haz clic para ver este día en el calendario diario";

      const nombreFisioTag = (window.currentProfileData && window.currentProfileData.rol === 'clinica')
        ? `<span style="display: block; font-size: 0.65rem; font-weight: 600; opacity: 0.85; margin-top: 1px;"><i class="fa-solid fa-user-doctor"></i> ${cita.nombre_fisio}</span>`
        : '';

      const textoCita = esReservado
        ? `<strong>${cita.hora}</strong> ${cita.nombre_paciente || 'Cliente'}`
        : esPausado
          ? `<strong>${cita.hora}</strong> Pausada`
          : `<strong>${cita.hora}</strong> Libre`;

      pill.innerHTML = `<div>${textoCita}</div>${nombreFisioTag}`;

      // Al hacer clic, te lleva a la vista diaria de ese día
      pill.onclick = (e) => {
        e.stopPropagation();
        if (window.irADiaCalendario) {
          window.irADiaCalendario(fechaIteracion);
        } else {
          const navCal = document.querySelector('.nav-item[data-tab="calendario"]');
          if (navCal) navCal.click();
        }
      };

      sessionsBox.appendChild(pill);
    });

    cell.appendChild(sessionsBox);

    // Clic en la celda vacía también te lleva a ese día
    cell.onclick = () => {
      if (window.irADiaCalendario) {
        window.irADiaCalendario(fechaIteracion);
      } else {
        const navCal = document.querySelector('.nav-item[data-tab="calendario"]');
        if (navCal) navCal.click();
      }
    };

    grid.appendChild(cell);
  }
}

// Escuchadores de controles de Citas Global
document.addEventListener('DOMContentLoaded', () => {
  const addSafe = (id, event, cb) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, cb);
  };

  addSafe('navCitasGlobal', 'click', () => {
    window.cargarCitasGlobal();
  });

  addSafe('globalPrevMonthBtn', 'click', () => {
    globalMonth.setMonth(globalMonth.getMonth() - 1);
    window.cargarCitasGlobal();
  });

  addSafe('globalNextMonthBtn', 'click', () => {
    globalMonth.setMonth(globalMonth.getMonth() + 1);
    window.cargarCitasGlobal();
  });

  addSafe('globalTodayBtn', 'click', () => {
    globalMonth = new Date();
    window.cargarCitasGlobal();
  });

  addSafe('globalFisioFilter', 'change', renderizarCitasGlobal);
  addSafe('globalEstadoFilter', 'change', renderizarCitasGlobal);
});