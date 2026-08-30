document.addEventListener('DOMContentLoaded', async () => {
  const btnCerrarSesion = document.getElementById('btnCerrarSesion');
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  const fisiosCountSpan = document.getElementById('fisiosCount');
  const fisiosListContainer = document.getElementById('fisiosListContainer');
  const addFisioForm = document.getElementById('addFisioForm');
  const btnGuardarFisio = document.getElementById('btnGuardarFisio');
  const btnEntrar = document.getElementById('btnEntrar');

  let clinicaId = null;
  let clinicEmail = null;
  let fisios = [];

  // Verificar sesión y cargar datos
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  clinicEmail = session.user.email;

  async function cargarDatos() {
    try {
      const { data: clinica } = await supabaseClient.from('clinicas').select('id').eq('user_id', session.user.id).single();
      if (clinica) {
        clinicaId = clinica.id;
        const { data: fisiosData } = await supabaseClient.from('fisios').select('*').eq('clinica_id', clinicaId);
        if (fisiosData) {
          fisios = fisiosData;
          renderFisios();
        }
      }
    } catch (e) {
      showError("Error cargando datos: " + e.message);
    }
  }

  function renderFisios() {
    fisiosCountSpan.textContent = fisios.length;
    fisiosListContainer.innerHTML = '';

    if (fisios.length > 0) {
      const h4 = document.createElement('h4');
      h4.textContent = "Fisioterapeutas creados:";
      h4.style.marginTop = "0";
      fisiosListContainer.appendChild(h4);
    }

    fisios.forEach(f => {
      const div = document.createElement('div');
      div.className = 'fisio-list-item';
      div.innerHTML = `
        <div>
          <strong>${f.nombre}</strong><br>
          <small style="color:#7f8c8d;">${f.email}</small>
        </div>
      `;
      fisiosListContainer.appendChild(div);
    });

    const faltan = 2 - fisios.length;
    if (faltan <= 0) {
      btnEntrar.style.backgroundColor = '#0d9488';
      btnEntrar.style.cursor = 'pointer';
      btnEntrar.disabled = false;
      btnEntrar.textContent = '¡Completar y Entrar!';
    } else {
      btnEntrar.style.backgroundColor = '#ccc';
      btnEntrar.style.cursor = 'not-allowed';
      btnEntrar.disabled = true;
      btnEntrar.textContent = `Faltan ${faltan} fisios para continuar`;
    }
  }

  function showError(msg) {
    successBox.style.display = 'none';
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function showSuccess(msg) {
    errorBox.style.display = 'none';
    successBox.textContent = msg;
    successBox.style.display = 'block';
    setTimeout(() => { successBox.style.display = 'none'; }, 4000);
  }

  btnCerrarSesion.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
  });

  addFisioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    const fNombre = document.getElementById('fNombre').value.trim();
    const fEmail = document.getElementById('fEmail').value.trim();
    const fTelefono = document.getElementById('fTelefono').value.trim();
    const fPrefix = document.getElementById('fPrefix').value;
    const fPassword = document.getElementById('fPassword').value;
    const cPassword = document.getElementById('cPassword').value;

    if (!fNombre || !fEmail || !fPassword || !cPassword) {
      return showError("Completa nombre, email y contraseñas obligatoriamente.");
    }

    btnGuardarFisio.disabled = true;
    btnGuardarFisio.textContent = 'Creando...';

    try {
      const fisioTelefonoFinal = fTelefono ? `${fPrefix}${fTelefono}` : 'Sin teléfono';

      // 1. Crear fisio en Auth
      const { data: authF, error: errF } = await supabaseClient.auth.signUp({
        email: fEmail,
        password: fPassword,
        options: {
          data: { full_name: fNombre, telefono: fisioTelefonoFinal },
          emailRedirectTo: 'https://fysiumapp.es/confirmado.html'
        }
      });
      if (errF) throw new Error(errF.message);

      // 2. Roles e inserts
      await supabaseClient.from('gestion_perfil').update({ rol: 'fisio' }).eq('user_id', authF.user.id);

      if (fisioTelefonoFinal !== 'Sin teléfono') {
        await supabaseClient.from('auth_user').update({ telefono: fisioTelefonoFinal }).eq('id_supabase', authF.user.id);
      }

      const { data: newFisio, error: errInsert } = await supabaseClient.from('fisios').insert({
        user_id: authF.user.id,
        nombre: fNombre,
        email: fEmail,
        telefono: fisioTelefonoFinal,
        plan_suscripcion: 'free',
        clinica_id: clinicaId
      }).select().single();

      if (errInsert) throw new Error("Error vinculando al fisio en la base de datos.");

      // 3. Reconectar clínica
      const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email: clinicEmail, password: cPassword });
      if (loginError) throw new Error("Fisio creado, pero falló la reconexión de la clínica. Por favor, vuelve a iniciar sesión.");

      fisios.push(newFisio);
      renderFisios();

      // Limpiar form
      document.getElementById('fNombre').value = '';
      document.getElementById('fEmail').value = '';
      document.getElementById('fTelefono').value = '';
      document.getElementById('fPassword').value = '';
      document.getElementById('cPassword').value = '';

      showSuccess("Fisioterapeuta añadido. Se le ha enviado un correo para que confirme su cuenta.");

    } catch (err) {
      showError(err.message);
    } finally {
      btnGuardarFisio.disabled = false;
      btnGuardarFisio.textContent = 'Guardar Fisioterapeuta';
    }
  });

  btnEntrar.addEventListener('click', () => {
    if (fisios.length >= 2) {
      window.location.href = 'dashboard.html';
    }
  });

  cargarDatos();
});
