document.addEventListener('DOMContentLoaded', () => {
  const resetForm = document.getElementById('resetForm');
  const errorBox = document.getElementById('errorBox');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;

    // Mostrar estado de carga visual
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';
    errorBox.style.display = 'none';

    try {
      // Actualizar la contraseña usando tu variable supabaseClient
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Éxito total
      errorBox.textContent = "¡Contraseña actualizada con éxito! Redirigiendo al login...";
      errorBox.style.display = 'block';
      errorBox.style.backgroundColor = '#dcfce7';
      errorBox.style.color = '#166534';
      errorBox.style.borderColor = '#86efac';

      // Esperamos 2 segunditos y al login web
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (error) {
      // Manejo de errores
      console.error("Error actualizando contraseña:", error);
      errorBox.textContent = "Error al cambiar la contraseña: " + error.message;
      errorBox.style.display = 'block';
      errorBox.style.backgroundColor = '#fee2e2';
      errorBox.style.color = '#991b1b';
      errorBox.style.borderColor = '#f87171';

      // Restaurar el botón a su estado normal
      btnText.style.display = 'block';
      btnSpinner.style.display = 'none';
    }
  });
});