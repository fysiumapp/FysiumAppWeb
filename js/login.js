document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const errorBox = document.getElementById('errorBox');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

    // Verificar si ya está logueado
    checkExistingSession();

    async function checkExistingSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            verificarRolUsuario(session.user.id);
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) return;

        setLoading(true);
        hideError();

        try {
            // Autenticación con Supabase
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Verificamos el rol (fisio o clinica)
            await verificarRolUsuario(data.user.id);

        } catch (error) {
            console.error(error);
            showError("Correo o contraseña incorrectos.");
            setLoading(false);
        }
    });

    async function verificarRolUsuario(userId) {
        try {
            // Buscamos el rol del usuario en gestion_perfil
            const { data, error } = await supabaseClient
                .from('gestion_perfil')
                .select('rol')
                .eq('user_id', userId)
                .single();

            if (error || !data || (data.rol !== 'fisio' && data.rol !== 'clinica')) {
                // Si no es fisio ni clinica, rechazamos.
                await supabaseClient.auth.signOut({ scope: 'local' });
                showError("Acceso denegado. Esta sección es exclusiva para profesionales.");
                setLoading(false);
                return;
            }

            // Es fisio o clínica, redirigir al dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Error validando rol:", error);
            await supabaseClient.auth.signOut({ scope: 'local' });
            showError("Error al verificar permisos.");
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'block';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnSpinner.style.display = 'none';
        }
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }

    function hideError() {
        errorBox.style.display = 'none';
    }

    // --- LÓGICA PARA RECUPERAR CONTRASEÑA ---
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();

            // 1. Comprobar que ha escrito un correo
            if (!email) {
                errorBox.textContent = "Por favor, escribe tu correo arriba para enviarte el enlace.";
                errorBox.style.display = 'block';
                errorBox.style.backgroundColor = '#fee2e2';
                errorBox.style.color = '#991b1b';
                errorBox.style.borderColor = '#f87171';
                return;
            }

            // 2. Estado de carga visual
            errorBox.textContent = "Enviando correo...";
            errorBox.style.display = 'block';
            errorBox.style.color = '#0f766e';
            errorBox.style.backgroundColor = '#ccfbf1';
            errorBox.style.borderColor = '#5eead4';

            // 3. Enviar el correo usando tu variable supabaseClient
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://fysiumapp.es/reset-password.html',
            });

            if (error) {
                // Aquí traducimos el error técnico a algo que el usuario entienda
                let msg = error.message;
                if (msg.includes("429")) {
                    msg = "Por favor, espera unos segundos antes de pedir otro correo.";
                } else if (msg.includes("not found")) {
                    msg = "No encontramos una cuenta con ese correo.";
                }

                errorBox.textContent = "Aviso: " + msg;
                errorBox.style.backgroundColor = '#fee2e2';
                errorBox.style.color = '#991b1b';
                errorBox.style.borderColor = '#f87171';
            } else {
                errorBox.textContent = "¡Correo enviado! Revisa tu bandeja de entrada.";
                errorBox.style.backgroundColor = '#dcfce7';
                errorBox.style.color = '#166534';
                errorBox.style.borderColor = '#86efac';
            }
        });
    }
});
