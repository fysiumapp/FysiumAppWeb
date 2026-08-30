// Estado global
let currentRole = 'fisio';
let fisiosClinica = [];

// Elementos DOM
const btnFisio = document.getElementById('btnRoleFisio');
const btnClinica = document.getElementById('btnRoleClinica');
const labelNombre = document.getElementById('labelNombre');
const labelTel1 = document.getElementById('labelTel1');
const groupTel2 = document.getElementById('groupTel2');
const clinicaSection = document.getElementById('clinicaSection');
const inputTel1 = document.getElementById('telefono');
const fisiosListContainer = document.getElementById('fisiosListContainer');
const modal = document.getElementById('fisioModal');
const errorBox = document.getElementById('errorBox');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const submitBtn = document.getElementById('submitBtn');

// 1. GESTIÓN DE LA INTERFAZ (Roles)
function setRole(role) {
  currentRole = role;
  errorBox.style.display = 'none';

  if (role === 'fisio') {
    btnFisio.classList.add('active');
    btnClinica.classList.remove('active');
    labelNombre.textContent = "Nombre Completo";
    labelTel1.textContent = "Teléfono";
    inputTel1.required = true;
    groupTel2.classList.add('hidden');
    clinicaSection.classList.add('hidden');
  } else {
    btnClinica.classList.add('active');
    btnFisio.classList.remove('active');
    labelNombre.textContent = "Nombre de la Clínica";
    labelTel1.textContent = "Teléfono Fijo (Opcional)";
    inputTel1.required = false;
    groupTel2.classList.remove('hidden');
    clinicaSection.classList.remove('hidden');
  }
}

// 2. GESTIÓN DEL MODAL DE FISIOS (Para Clínicas)
function openFisioModal() {
  modal.classList.remove('hidden');
  document.getElementById('modalError').style.display = 'none';
  // Limpiar campos
  document.getElementById('m_nombre').value = '';
  document.getElementById('m_email').value = '';
  document.getElementById('m_telefono').value = '';
  document.getElementById('m_password').value = '';
}

function closeFisioModal() {
  modal.classList.add('hidden');
}

function saveFisio() {
  const nombre = document.getElementById('m_nombre').value.trim();
  const email = document.getElementById('m_email').value.trim();
  const telefono = document.getElementById('m_telefono').value.trim();
  const prefix = document.getElementById('m_prefix').value;
  const password = document.getElementById('m_password').value;

  if (!nombre || !email || !password) {
    const errorDiv = document.getElementById('modalError');
    errorDiv.textContent = 'Completa nombre, email y contraseña';
    errorDiv.style.display = 'block';
    return;
  }

  fisiosClinica.push({ nombre, email, telefono, prefix, password });
  renderFisiosList();
  closeFisioModal();
}

function removeFisio(index) {
  fisiosClinica.splice(index, 1);
  renderFisiosList();
}

function renderFisiosList() {
  fisiosListContainer.innerHTML = '';
  fisiosClinica.forEach((f, index) => {
    const div = document.createElement('div');
    div.className = 'fisio-list-item';
    div.innerHTML = `
            <div>
                <strong>Fisio ${index + 1}: ${f.nombre}</strong><br>
                <small style="color:#7f8c8d;">${f.email}</small>
            </div>
            <button type="button" onclick="removeFisio(${index})" style="background:none; border:none; color:red; cursor:pointer; font-size:18px;">&times;</button>
        `;
    fisiosListContainer.appendChild(div);
  });
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
  submitBtn.disabled = false;
  btnText.style.display = 'block';
  btnSpinner.style.display = 'none';
}

// 3. LÓGICA DE REGISTRO EN SUPABASE
document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  // Recoger valores principales
  const nombre = document.getElementById('nombre').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const terminos = document.getElementById('terminos').checked;

  // Validaciones extra
  if (!terminos) {
    return showError("Debes aceptar los Términos y la Política de Privacidad.");
  }

  // Se elimina la validación de 2 fisios mínimos aquí, ya que ahora se hace en el onboarding

  // Preparar UI para cargar
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'block';

  try {
    // PREPARAR TELÉFONOS (Lógica de registro.tsx)
    let telefonoAGuardar = '';

    if (currentRole === 'clinica') {
      const t1 = document.getElementById('telefono').value.trim();
      const p1 = document.getElementById('prefix1').value;
      const tel1 = t1 ? `${p1}${t1}` : '';

      const t2 = document.getElementById('telefono2').value.trim();
      const p2 = document.getElementById('prefix2').value;
      const tel2 = t2 ? `${p2}${t2}` : '';

      if (tel1 && tel2) telefonoAGuardar = `${tel1} / ${tel2}`;
      else if (tel1) telefonoAGuardar = tel1;
      else if (tel2) telefonoAGuardar = tel2;

      if (!telefonoAGuardar) telefonoAGuardar = 'Sin teléfono';
    } else {
      const t1 = document.getElementById('telefono').value.trim();
      const p1 = document.getElementById('prefix1').value;
      telefonoAGuardar = `${p1}${t1}`;
    }

    // ----- REGISTRO CLÍNICA -----
    if (currentRole === 'clinica') {

      // 1. Crear usuario clínica
      const { data: authC, error: errC } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: nombre, telefono: telefonoAGuardar },
          emailRedirectTo: 'https://fysiumapp.es/confirmado.html'
        }
      });
      if (errC) throw new Error(errC.message);
      if (!authC.user) throw new Error("No se pudo crear la clínica");

      // 2. Asignar rol
      await supabaseClient.from('gestion_perfil').update({ rol: 'clinica' }).eq('user_id', authC.user.id);

      // 3. Crear perfil de clínica
      const { data: clinicaData, error: errClinica } = await supabaseClient.from('clinicas').insert({
        user_id: authC.user.id,
        nombre: nombre,
        email: email,
        telefono: telefonoAGuardar,
        plan_suscripcion: 'free'
      }).select().single();

      if (errClinica) throw new Error(`Error en datos de clínica: ${errClinica.message}`);

      // 4. Autenticar y redirigir al Onboarding
      await supabaseClient.auth.signInWithPassword({ email: email, password: password });
      window.location.href = 'configuracion-clinica.html';
      return;

    }
    // ----- REGISTRO FISIO INDIVIDUAL -----
    else {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: nombre, telefono: telefonoAGuardar },
          emailRedirectTo: 'https://fysiumapp.es/confirmado.html'
        }
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("No se pudo crear el usuario.");

      await supabaseClient.from('gestion_perfil').update({ rol: 'fisio' }).eq('user_id', authData.user.id);

      const { error: fisioError } = await supabaseClient.from('fisios').upsert({
        user_id: authData.user.id,
        nombre: nombre,
        email: email,
        telefono: telefonoAGuardar,
        plan_suscripcion: 'free',
      });
      if (fisioError) throw new Error(`Fallo al crear ficha: ${fisioError.message}`);

      await supabaseClient.from('auth_user').update({ telefono: telefonoAGuardar }).eq('id_supabase', authData.user.id);
    }

    // Éxito: Redirigir al login o al dashboard web
    alert("¡Casi listo! Revisa tu bandeja de entrada (y Spam) para confirmar tu correo antes de entrar.");
    window.location.href = 'login.html';

  } catch (error) {
    showError(error.message || "Error inesperado durante el registro.");
  }
});