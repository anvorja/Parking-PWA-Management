// src/pages/Users.tsx
// HU-002: Listar usuarios
// HU-003: Crear usuario
// HU-004: Editar usuario
// HU-005: Eliminar usuario
//
// Este componente es exclusivamente de presentación: toda la lógica de
// negocio, estado y llamadas al servicio viven en UsuarioProvider/useUsuarios.

import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useUsuarios } from '../hooks/useUsuarios';
import { useApp } from '../hooks/useApp';
import { UsuarioListItemResponse, CrearUsuarioRequest } from '../services/usuarioService';
import BottomNav from '../components/BottomNav';

// ─── Valores iniciales del formulario ─────────────────────────────────────────

const FORM_VACIO: CrearUsuarioRequest = {
    nombreCompleto:         '',
    nombreUsuario:          '',
    contrasena:             '',
    confirmacionContrasena: '',
    rol:                    'AUXILIAR',
}

// ─── Helpers de presentación (sin lógica de negocio) ─────────────────────────

function getRoleDisplayName(rol: string): string {
    if (rol === 'ADMINISTRADOR') return 'Administrador'
    if (rol === 'AUXILIAR') return 'Auxiliar'
    return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase()
}

function getRoleClasses(rol: string): string {
    if (rol === 'ADMINISTRADOR') return 'bg-purple-50 text-purple-700 ring-purple-700/10'
    return 'bg-blue-50 text-blue-700 ring-blue-700/10'
}

function getAvatarSrc(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Users: React.FC = () => {
    const {
        usuarios,
        usuariosFiltrados,
        isLoading,
        isSubmitting,
        isDeleting,
        searchQuery,
        setSearchQuery,
        selectedRole,
        setSelectedRole,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
        toast,
        clearToast,
    } = useUsuarios()

    const { estadoRed } = useApp()

    // ── Estado de UI local (modal, formulario, target de eliminación) ──────────
    // Solo estado de interacción visual — no estado de negocio.

    const [isModalOpen, setIsModalOpen]   = useState(false)
    const [formData, setFormData]         = useState<CrearUsuarioRequest>(FORM_VACIO)
    const [errorMsg, setErrorMsg]         = useState('')
    const [deleteTarget, setDeleteTarget] = useState<UsuarioListItemResponse | null>(null)
    const [editTarget, setEditTarget]     = useState<UsuarioListItemResponse | null>(null)

    // Conteos para los chips de filtro
    const countTodos    = usuarios.length
    const countAdmin    = usuarios.filter(u => u.rol === 'ADMINISTRADOR').length
    const countAuxiliar = usuarios.filter(u => u.rol === 'AUXILIAR').length

    // ── Handlers de modal ──────────────────────────────────────────────────────

    const handleOpenModal = () => {
        setEditTarget(null)
        setFormData(FORM_VACIO)
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleEditClick = (usuario: UsuarioListItemResponse) => {
        setEditTarget(usuario)
        setFormData({
            nombreCompleto:         usuario.nombreCompleto,
            nombreUsuario:          usuario.nombreUsuario,
            contrasena:             '',
            confirmacionContrasena: '',
            rol:                    usuario.rol,
        })
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditTarget(null)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // ── Submit: crear o editar ─────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        // Validación local de contraseñas (solo si se rellenaron en edición)
        if (formData.contrasena || formData.confirmacionContrasena) {
            if (formData.contrasena !== formData.confirmacionContrasena) {
                setErrorMsg('Las contraseñas no coinciden')
                return
            }
        }

        try {
            if (editTarget) {
                await editarUsuario(editTarget.id, {
                    nombreCompleto:         formData.nombreCompleto,
                    nombreUsuario:          formData.nombreUsuario,
                    contrasena:             formData.contrasena || undefined,
                    confirmacionContrasena: formData.confirmacionContrasena || undefined,
                    rol:                    formData.rol,
                })
            } else {
                await crearUsuario(formData)
            }
            // Solo cerramos si el provider no lanzó error
            handleCloseModal()
        } catch (error: unknown) {
            // El provider ya gestionó el toast de error; aquí mostramos
            // el mensaje en el formulario para no perder el contexto del modal.
            const msg = error instanceof Error
                ? error.message
                : 'Error al guardar el usuario. Por favor intenta de nuevo.'
            setErrorMsg(msg)
        }
    }

    // ── Confirmación de eliminación ────────────────────────────────────────────

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        try {
            await eliminarUsuario(deleteTarget.id)
        } finally {
            // Cerramos el modal siempre: en éxito y en error.
            // El toast de resultado ya lo gestiona el provider.
            setDeleteTarget(null)
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">

                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 'var(--network-banner-height, 0px)',
                    zIndex: 20,
                    borderBottom: '1px solid var(--color-border)', background: '#fff', padding: '12px 16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Gestión de Usuarios</h1>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                                {isLoading ? 'Cargando...' : `${countAdmin} admin · ${countAuxiliar} auxiliar · ${countTodos} total`}
                            </p>
                        </div>

                        {/* Indicador de estado de red */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '11px', fontWeight: 600,
                            color: estadoRed === 'online' ? 'var(--color-success-dark)' : estadoRed === 'offline' ? 'var(--color-danger-dark)' : '#1e40af',
                        }}>
                            <div style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: estadoRed === 'online' ? 'var(--color-success)' : estadoRed === 'offline' ? 'var(--color-danger)' : '#3b82f6',
                            }} />
                            {estadoRed === 'online' ? 'En línea' : estadoRed === 'offline' ? 'Sin conexión' : 'Sincronizando'}
                        </div>

                        <button
                            onClick={handleOpenModal}
                            style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                        </button>
                    </div>

                    {/* Chips de filtro por rol */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(['Todos', 'ADMINISTRADOR', 'AUXILIAR'] as const).map(rol => (
                            <button
                                key={rol}
                                onClick={() => setSelectedRole(rol)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    border: `1px solid ${selectedRole === rol ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    background: selectedRole === rol ? 'var(--color-primary)' : '#fff',
                                    color: selectedRole === rol ? '#fff' : 'var(--color-text-secondary)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {rol === 'Todos' ? 'Todos' : rol === 'ADMINISTRADOR' ? 'Admin' : 'Auxiliar'}
                            </button>
                        ))}
                    </div>
                </header>

                <IonContent fullscreen className="bg-[#f6f7f8] font-display text-slate-900 antialiased" style={{ '--background': 'transparent' }}>
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

                        {/* Buscador */}
                        <div className="sticky top-0 z-10 bg-white px-4 py-2 shadow-sm border-b border-slate-100">
                            <label className="relative flex w-full items-center">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </div>
                                <input
                                    className="block w-full rounded-lg border-none bg-slate-100 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-500 focus:ring-1 focus:ring-primary/50 outline-none"
                                    placeholder="Buscar usuario..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="px-4 pt-4 pb-2">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-500">Lista de Usuarios</h3>
                        </div>

                        {/* Lista */}
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 bg-white">
                                {usuariosFiltrados.length === 0 ? (
                                    <li className="p-8 text-center text-slate-500 text-sm">
                                        No se encontraron usuarios
                                    </li>
                                ) : (
                                    usuariosFiltrados.map(usuario => (
                                        <li key={usuario.id} className="group relative flex items-center justify-between p-3 px-4 hover:bg-slate-50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={getAvatarSrc(usuario.nombreCompleto)}
                                                        alt={usuario.nombreCompleto}
                                                        className="h-10 w-10 rounded-full object-cover bg-slate-200"
                                                    />
                                                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-[1.5px] ring-white"></span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-[13px] font-semibold text-slate-900 leading-tight">{usuario.nombreCompleto}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getRoleClasses(usuario.rol)}`}>
                                                            {getRoleDisplayName(usuario.rol)}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-medium">• ID: {usuario.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditClick(usuario)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 transition-all duration-200 rounded-full hover:bg-blue-50/80 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(usuario)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-all duration-200 rounded-full hover:bg-red-50/80 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}

                        {/* Estado vacío cuando no hay usuarios en absoluto */}
                        {!isLoading && usuarios.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">group_off</span>
                                <p className="text-sm font-medium text-slate-500">No hay usuarios registrados</p>
                                <p className="text-xs text-slate-400 mt-1">Crea el primer usuario con el botón +</p>
                            </div>
                        )}

                        <div className="h-24"></div>
                    </div>
                </IonContent>

                <BottomNav />

                {/* ── Modal Crear / Editar Usuario ─────────────────────────────── */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {editTarget ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        border: 'none', background: 'transparent', color: 'var(--color-text-muted)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', transition: 'all 0.2s',
                                        outline: 'none', padding: 0, margin: 0,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto max-h-[70vh]">
                                {errorMsg && (
                                    <div className="mb-4 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">
                                        {errorMsg}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            name="nombreCompleto"
                                            required
                                            value={formData.nombreCompleto}
                                            onChange={handleInputChange}
                                            style={{ color: 'var(--color-text-primary)' }}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                            placeholder="Ej. Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Usuario</label>
                                        <input
                                            type="text"
                                            name="nombreUsuario"
                                            required
                                            value={formData.nombreUsuario}
                                            onChange={handleInputChange}
                                            style={{ color: 'var(--color-text-primary)' }}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                            placeholder="Ej. jperez"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
                                        <div className="relative">
                                            <select
                                                name="rol"
                                                required
                                                value={formData.rol}
                                                onChange={handleInputChange}
                                                style={{ color: 'var(--color-text-primary)' }}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                                            >
                                                <option value="AUXILIAR">Auxiliar</option>
                                                <option value="ADMINISTRADOR">Administrador</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                                            Contraseña{' '}
                                            {editTarget && <span className="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            name="contrasena"
                                            required={!editTarget}
                                            minLength={6}
                                            value={formData.contrasena}
                                            onChange={handleInputChange}
                                            style={{ color: 'var(--color-text-primary)' }}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                            placeholder={editTarget ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                                            Confirmar Contraseña{' '}
                                            {editTarget && <span className="text-slate-400 font-normal">(opcional)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmacionContrasena"
                                            required={!editTarget}
                                            minLength={6}
                                            value={formData.confirmacionContrasena}
                                            onChange={handleInputChange}
                                            style={{ color: 'var(--color-text-primary)' }}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                            placeholder={editTarget ? 'Confirmar nueva contraseña' : 'Confirma la contraseña'}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3 pb-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        style={{
                                            minHeight: '48px', borderRadius: '14px',
                                            border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)',
                                            color: '#475569', fontSize: '14px', fontWeight: 600,
                                            cursor: 'pointer', flex: 1, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s', outline: 'none',
                                            margin: 0, padding: '0 16px',
                                        }}
                                        className="active:scale-[0.97]"
                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border)'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-alt)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            minHeight: '48px', borderRadius: '14px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            color: '#fff', fontSize: '14px', fontWeight: 600,
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            flex: 1, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', transition: 'all 0.2s',
                                            outline: 'none', margin: 0, padding: '0 16px',
                                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                                            opacity: isSubmitting ? 0.7 : 1,
                                        }}
                                        className="active:scale-[0.97]"
                                        onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.45)' } }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.35)' }}
                                    >
                                        {isSubmitting ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            editTarget ? 'Guardar Cambios' : 'Crear Usuario'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Modal Confirmar Eliminación ──────────────────────────────── */}
                {deleteTarget && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget && !isDeleting) setDeleteTarget(null) }}
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden">
                            <div className="px-5 pt-6 pb-2 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                                    <span className="material-symbols-outlined text-red-500 text-[28px]">warning</span>
                                </div>
                                <h3 className="text-[16px] font-semibold text-slate-800">Eliminar Usuario</h3>
                                <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
                                    ¿Estás seguro de eliminar a{' '}
                                    <strong className="text-slate-700">{deleteTarget.nombreCompleto}</strong>?
                                    {' '}Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="px-5 pb-5 pt-3 flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={isDeleting}
                                    style={{
                                        minHeight: '48px', borderRadius: '14px',
                                        border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)',
                                        color: '#475569', fontSize: '14px', fontWeight: 600,
                                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', transition: 'all 0.2s',
                                        outline: 'none', margin: 0, padding: '0 16px',
                                    }}
                                    className="active:scale-[0.97]"
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border)'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-alt)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    style={{
                                        minHeight: '48px', borderRadius: '14px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-dark) 100%)',
                                        color: '#fff', fontSize: '14px', fontWeight: 600,
                                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', transition: 'all 0.2s',
                                        outline: 'none', margin: 0, padding: '0 16px',
                                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                                        opacity: isDeleting ? 0.7 : 1,
                                    }}
                                    className="active:scale-[0.97]"
                                    onMouseEnter={e => { if (!isDeleting) { e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-danger-dark) 0%, #b91c1c 100%)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.45)' } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-dark) 100%)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.35)' }}
                                >
                                    {isDeleting ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        'Eliminar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Toast de feedback ────────────────────────────────────────── */}
                {toast && (
                    <div
                        style={{
                            position: 'fixed', top: '20px', right: '20px', zIndex: 100,
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: '#fff', borderRadius: '14px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            padding: '14px 20px', minWidth: '260px', maxWidth: '380px',
                            border: toast.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            animation: 'slideInRight 0.35s ease-out',
                        }}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: toast.type === 'success' ? '#16a34a' : 'var(--color-danger-dark)' }}>
                                {toast.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{toast.message}</span>
                        <button
                            onClick={clearToast}
                            style={{
                                marginLeft: 'auto', background: 'transparent', border: 'none',
                                cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px',
                                display: 'flex', alignItems: 'center', outline: 'none',
                                borderRadius: '50%', width: '28px', height: '28px', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
                    </div>
                )}
            </div>
        </IonPage>
    )
}

export default Users