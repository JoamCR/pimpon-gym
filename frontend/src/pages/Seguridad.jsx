import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  IconShieldLock,
  IconUserPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconUser,
  IconLock,
  IconEyeOff,
  IconCheck,
  IconUsers,
  IconLayoutDashboard,
  IconClipboardHeart,
  IconCalendarEvent,
  IconCheckbox,
  IconChartBar,
  IconCash,
  IconSettings,
  IconAlertTriangle
} from '@tabler/icons-react';
import { GymCard } from '../components/ui/GymCard';
import { GymModal } from '../components/ui/GymModal';
import { GymButton } from '../components/ui/GymButton';
import { PageHeader } from '../components/ui/PageHeader';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';

// Configuración de las páginas del sistema disponibles para asignar acceso
const SYSTEM_PAGES = [
  { path: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={18} /> },
  { path: '/clients', label: 'Clientes', icon: <IconUsers size={18} /> },
  { path: '/patients', label: 'Pacientes', icon: <IconClipboardHeart size={18} /> },
  { path: '/agenda', label: 'Agenda', icon: <IconCalendarEvent size={18} /> },
  { path: '/attendance', label: 'Asistencia', icon: <IconCheckbox size={18} /> },
  { path: '/statistics', label: 'Estadísticas', icon: <IconChartBar size={18} /> },
  { path: '/finanzas', label: 'Finanzas', icon: <IconCash size={18} /> },
  { path: '/config', label: 'Configuración', icon: <IconSettings size={18} /> },
  { path: '/seguridad', label: 'Seguridad', icon: <IconShieldLock size={18} /> },
];

const ROLES_MAP = {
  owner: 'Propietario (Owner)',
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  nutritionist: 'Nutriólogo',
  user: 'Usuario Personalizado'
};

// Componente para inputs estilizados con el diseño del Login
const LoginStyledInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  action,
  required = false,
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center bg-[var(--color-card-alt)] border border-[var(--color-border)] rounded-2xl focus-within:border-[var(--color-teal)] focus-within:ring-2 focus-within:ring-[var(--color-teal)]/20 transition-all overflow-hidden">
        {icon && <div className="pl-4 text-[var(--color-text-muted)]">{icon}</div>}
        <input
          type={type}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full py-3.5 pl-3 pr-3 text-sm font-semibold bg-transparent border-none outline-none text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
        />
        {action}
      </div>
    </div>
  );
};

export default function Seguridad() {
  const { data: usersData, isLoading } = useUsers();
  const usersList = Array.isArray(usersData?.data) ? usersData.data : [];

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Estados para modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  // Campos del formulario
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'receptionist',
    allowed_pages: ['/dashboard', '/clients', '/patients', '/agenda', '/attendance']
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Limpiar y abrir modal de creación
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      full_name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'receptionist',
      allowed_pages: ['/dashboard', '/clients', '/patients', '/agenda', '/attendance']
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFormModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    const userPages = Array.isArray(user.allowed_pages) 
      ? user.allowed_pages 
      : (typeof user.allowed_pages === 'string' ? JSON.parse(user.allowed_pages) : []);

    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'receptionist',
      allowed_pages: userPages
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFormModalOpen(true);
  };

  // Abrir modal de visualización
  const handleOpenViewModal = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  // Abrir modal de eliminación
  const handleOpenDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Switch toggle de accesos
  const togglePageAccess = (pagePath) => {
    setFormData((prev) => {
      const exists = prev.allowed_pages.includes(pagePath);
      const updatedPages = exists
        ? prev.allowed_pages.filter((p) => p !== pagePath)
        : [...prev.allowed_pages, pagePath];
      return { ...prev, allowed_pages: updatedPages };
    });
  };

  // Guardar usuario (crear o editar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Por favor ingresa el nombre completo');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Por favor ingresa un nombre de usuario');
      return;
    }

    if (modalMode === 'create') {
      if (!formData.password) {
        toast.error('Por favor ingresa una contraseña');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    } else {
      if (formData.password && formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    try {
      if (modalMode === 'create') {
        await createUserMutation.mutateAsync({
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          password: formData.password,
          role: formData.role,
          allowed_pages: formData.allowed_pages
        });
        toast.success('Usuario registrado exitosamente');
      } else {
        const payload = {
          id: selectedUser.id,
          full_name: formData.full_name.trim(),
          username: formData.username.trim(),
          role: formData.role,
          allowed_pages: formData.allowed_pages
        };
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password;
        }
        await updateUserMutation.mutateAsync(payload);
        toast.success('Usuario actualizado exitosamente');
      }
      setIsFormModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al guardar el usuario');
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUserMutation.mutateAsync(selectedUser.id);
      toast.success('Usuario eliminado correctamente');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el usuario');
    }
  };

  // Filtrado de usuarios en tabla
  const filteredUsers = usersList.filter((user) => {
    const q = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(q) ||
      user.username?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen p-6 bg-[var(--color-surface)] space-y-6">
      {/* ENCABEZADO DE LA PÁGINA */}
      <PageHeader
        icon={<IconShieldLock size={18} />}
        tag="Módulo de Seguridad"
        title="Seguridad y Control de Acceso"
        subtitle="Administra los usuarios del sistema y asigna los módulos y vistas a los que tienen acceso."
        actions={
          <GymButton
            icon={<IconUserPlus size={18} />}
            variant="primary"
            onClick={handleOpenCreateModal}
          >
            Añadir usuario
          </GymButton>
        }
      />

      {/* SECCIÓN USUARIOS Y TABLA CON ESTILO CEBRA */}
      <GymCard title="Usuarios" variant="default">
        <div className="space-y-6">
          {/* Barra de búsqueda */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuario por nombre, nick o rol..."
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-teal)]"
            />
          </div>

          {/* TABLA ESTILO CEBRA (Exactos mismos colores y tipografías que Clientes y Pacientes) */}
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card-alt)]">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs uppercase tracking-[0.15em] select-none">
                  <th className="px-4 py-4">Usuario</th>
                  <th className="px-4 py-4">Rol</th>
                  <th className="px-4 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : filteredUsers.map((user, index) => {
                  const pagesCount = Array.isArray(user.allowed_pages) 
                    ? user.allowed_pages.length 
                    : (typeof user.allowed_pages === 'string' ? JSON.parse(user.allowed_pages || '[]').length : 0);

                  return (
                    <tr
                      key={user.id}
                      className={index % 2 === 0 ? 'bg-[var(--color-card-alt)]' : 'bg-[var(--color-card)]'}
                    >
                      {/* COLUMNA: USUARIO */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-gold)] text-white font-bold text-lg shadow-sm">
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p
                              className="font-semibold text-[var(--color-text)] cursor-pointer hover:underline"
                              onClick={() => handleOpenViewModal(user)}
                            >
                              {user.full_name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* COLUMNA: ROL */}
                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold ${
                              user.role === 'owner' || user.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : user.role === 'nutritionist'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {ROLES_MAP[user.role] || user.role}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            {user.role === 'owner' ? 'Acceso Total' : `${pagesCount} vistas permitidas`}
                          </span>
                        </div>
                      </td>

                      {/* COLUMNA: ACCIONES (Botones Ver, Editar, Eliminar) */}
                      <td className="px-4 py-4 space-x-2 whitespace-nowrap">
                        <GymButton
                          size="xs"
                          variant="secondary"
                          icon={<IconEye size={16} />}
                          onClick={() => handleOpenViewModal(user)}
                        >
                          Ver
                        </GymButton>
                        <GymButton
                          size="xs"
                          variant="primary"
                          icon={<IconEdit size={16} />}
                          onClick={() => handleOpenEditModal(user)}
                        >
                          Editar
                        </GymButton>
                        {user.role !== 'owner' && (
                          <GymButton
                            size="xs"
                            variant="danger"
                            icon={<IconTrash size={16} />}
                            onClick={() => handleOpenDeleteModal(user)}
                          >
                            Eliminar
                          </GymButton>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GymCard>

      {/* MODAL (GymModal) NUEVO / EDITAR USUARIO */}
      <GymModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-6">
          {/* Nombre y Usuario */}
          <div className="grid gap-4 sm:grid-cols-2">
            <LoginStyledInput
              id="full_name"
              label="Nombre del usuario"
              placeholder="Ej. Juan Pérez"
              icon={<IconUser size={18} />}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />

            <LoginStyledInput
              id="username"
              label="Nombre de usuario (nick)"
              placeholder="Ej. jperez"
              icon={<IconUser size={18} />}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          {/* Contraseña y Confirmar Contraseña (estilo Login) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <LoginStyledInput
              id="password"
              label={modalMode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<IconLock size={18} />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={modalMode === 'create'}
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              }
            />

            <LoginStyledInput
              id="confirmPassword"
              label="Confirmar contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<IconLock size={18} />}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required={modalMode === 'create' || Boolean(formData.password)}
              action={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              }
            />
          </div>

          {/* Rol del Usuario */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Rol de usuario
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-alt)] px-4 py-3.5 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-teal)]"
            >
              <option value="receptionist">Recepcionista</option>
              <option value="nutritionist">Nutriólogo</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuario Personalizado</option>
            </select>
          </div>

          {/* ASIGNACIÓN DE VISTAS PERMITIDAS (BOTONES SWITCH COMO MODO NOCTURNO DEL LAYOUT) */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text)]">Acceso a Vistas y Módulos</h4>
              <p className="text-xs text-[var(--color-text-muted)]">
                Activa o desactiva las pantallas a las que este usuario podrá ingresar en el sistema.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {SYSTEM_PAGES.map((page) => {
                const isChecked = formData.allowed_pages.includes(page.path);
                return (
                  <div
                    key={page.path}
                    onClick={() => togglePageAccess(page.path)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/40 text-[var(--color-text)] font-medium'
                        : 'bg-[var(--color-card-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isChecked ? 'text-[var(--color-gold)]' : 'text-[var(--color-text-muted)]'}>
                        {page.icon}
                      </span>
                      <span className="text-xs font-semibold">{page.label}</span>
                    </div>

                    {/* BOTÓN EN FORMA DE SWITCH (Exacto estilo al botón de Modo Nocturno del Layout) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageAccess(page.path);
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        isChecked ? 'bg-[var(--color-gold)]' : 'bg-slate-600'
                      }`}
                      aria-label={`Toggle ${page.label}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isChecked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <GymButton
              type="button"
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancelar
            </GymButton>
            <GymButton
              type="submit"
              variant="primary"
              icon={<IconCheck size={18} />}
              loading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              Guardar Usuario
            </GymButton>
          </div>
        </form>
      </GymModal>

      {/* MODAL VER DETALLES DE USUARIO */}
      {selectedUser && (
        <GymModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Detalles del Usuario"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-card-alt)] border border-[var(--color-border)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-gold)] text-white font-bold text-2xl shadow-md">
                {selectedUser.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">{selectedUser.full_name}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">@{selectedUser.username}</p>
                <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
                  {ROLES_MAP[selectedUser.role] || selectedUser.role}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Vistas y Módulos Permitidos
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {SYSTEM_PAGES.map((page) => {
                  const userPages = Array.isArray(selectedUser.allowed_pages)
                    ? selectedUser.allowed_pages
                    : (typeof selectedUser.allowed_pages === 'string' ? JSON.parse(selectedUser.allowed_pages || '[]') : []);

                  const hasAccess = selectedUser.role === 'owner' || userPages.includes(page.path);
                  if (!hasAccess) return null;

                  return (
                    <span
                      key={page.path}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/30"
                    >
                      {page.icon}
                      <span>{page.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
              <GymButton variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                Cerrar
              </GymButton>
            </div>
          </div>
        </GymModal>
      )}

      {/* MODAL ELIMINAR USUARIO */}
      {selectedUser && (
        <GymModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Usuario"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
              <IconAlertTriangle size={32} className="shrink-0" />
              <div>
                <p className="font-semibold">¿Estás seguro de que deseas eliminar este usuario?</p>
                <p className="text-xs text-red-300/80 mt-1">
                  Se removerán los accesos de <strong className="text-white">{selectedUser.full_name}</strong> (@{selectedUser.username}) al sistema.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <GymButton variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </GymButton>
              <GymButton
                variant="danger"
                icon={<IconTrash size={18} />}
                onClick={handleConfirmDelete}
                loading={deleteUserMutation.isPending}
              >
                Eliminar definitivamente
              </GymButton>
            </div>
          </div>
        </GymModal>
      )}
    </div>
  );
}
