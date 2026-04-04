// src/components/DatePickerFilter.tsx
// Filtro de fecha con calendario estilo Google Calendar.
// Desktop: Popover anclado al botón trigger.
// Mobile:  Bottom sheet deslizable desde abajo.

import React, { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerFilterProps {
    value: string          // YYYY-MM-DD o ''
    onChange: (v: string) => void
    onClear: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(v: string): Date | undefined {
    if (!v) return undefined
    try { return parseISO(v) } catch { return undefined }
}

function toYMD(d: Date): string {
    return format(d, 'yyyy-MM-dd')
}

function labelFecha(v: string): string {
    if (!v) return ''
    try {
        return format(parseISO(v), "d 'de' MMM, yyyy", { locale: es })
    } catch { return v }
}

// ─── Desktop: Popover ─────────────────────────────────────────────────────────

function DesktopPicker({ value, onChange, onClear }: DatePickerFilterProps) {
    const [open, setOpen] = useState(false)
    const selected = toDate(value)

    const handleSelect = (day: Date | undefined) => {
        if (day) {
            onChange(toYMD(day))
            setOpen(false)
        }
    }

    const handleHoy = () => {
        onChange(toYMD(new Date()))
        setOpen(false)
    }

    const handleBorrar = () => {
        onClear()
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '7px 12px', borderRadius: '10px',
                        border: `1.5px solid ${value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: value ? '#eff6ff' : 'var(--color-surface-alt)',
                        color: value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontSize: '13px', fontWeight: value ? 700 : 500,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                    }}
                >
                    <CalendarDays size={16} style={{ flexShrink: 0 }} />
                    <span>{value ? labelFecha(value) : 'Filtrar por fecha'}</span>
                    {value && (
                        <span
                            role="button"
                            onClick={e => { e.stopPropagation(); handleBorrar() }}
                            style={{ display: 'flex', alignItems: 'center', marginLeft: '2px', color: 'var(--color-primary)', cursor: 'pointer' }}
                        >
                            <X size={14} />
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} style={{ width: '280px', padding: 0, overflow: 'hidden' }}>
                {/* Header del popover */}
                <div style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 16px 10px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                        Seleccionar fecha
                    </p>
                    {value && (
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                            {labelFecha(value)}
                        </p>
                    )}
                </div>

                {/* Calendario */}
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    defaultMonth={selected ?? new Date()}
                    disabled={{ after: new Date() }}
                />

                {/* Footer */}
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                        onClick={handleBorrar}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Borrar
                    </button>
                    <button
                        onClick={handleHoy}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Hoy
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── Mobile: Bottom Sheet ─────────────────────────────────────────────────────

function MobilePicker({ value, onChange, onClear }: DatePickerFilterProps) {
    const [open, setOpen] = useState(false)
    const selected = toDate(value)

    // Bloquear scroll del body cuando el sheet está abierto
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    const handleSelect = (day: Date | undefined) => {
        if (day) {
            onChange(toYMD(day))
            setOpen(false)
        }
    }

    const handleHoy = () => {
        onChange(toYMD(new Date()))
        setOpen(false)
    }

    const handleBorrar = () => {
        onClear()
        setOpen(false)
    }

    return (
        <>
            {/* Trigger: icono de calendario */}
            <button
                onClick={() => setOpen(true)}
                style={{
                    width: '38px', height: '38px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '10px',
                    border: `1.5px solid ${value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: value ? '#eff6ff' : 'var(--color-surface-alt)',
                    color: value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                }}
            >
                <CalendarDays size={19} />
            </button>

            {/* Badge de fecha activa */}
            {value && (
                <button
                    onClick={handleBorrar}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '8px', border: '1.5px solid var(--color-primary)', background: '#eff6ff', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                >
                    <span style={{ textTransform: 'capitalize' }}>
                        {format(parseISO(value), "d MMM", { locale: es })}
                    </span>
                    <X size={13} />
                </button>
            )}

            {/* Overlay */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease' }}
                />
            )}

            {/* Bottom Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
                background: '#fff',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
                transform: open ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                paddingBottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
            }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: '#e2e8f0' }} />
                </div>

                {/* Título */}
                <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Filtrar por fecha</p>
                        {value && (
                            <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, margin: '2px 0 0', textTransform: 'capitalize' }}>
                                {labelFecha(value)}
                            </p>
                        )}
                    </div>
                    <button onClick={() => setOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Calendario centrado */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={handleSelect}
                        defaultMonth={selected ?? new Date()}
                        disabled={{ after: new Date() }}
                        classNames={{
                            month_grid: 'w-full border-collapse',
                            weekday: 'w-11 text-[12px] font-semibold text-slate-400 text-center uppercase',
                            day_button: 'h-11 w-11 flex items-center justify-center rounded-full text-[15px] font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer select-none',
                        }}
                    />
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 20px 16px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleBorrar}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Borrar
                    </button>
                    <button
                        onClick={handleHoy}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(19,127,236,0.3)' }}
                    >
                        Hoy
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            `}</style>
        </>
    )
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function DatePickerFilter(props: DatePickerFilterProps) {
    return (
        <>
            {/* Mobile */}
            <div className="flex md:hidden items-center gap-2">
                <MobilePicker {...props} />
            </div>
            {/* Desktop */}
            <div className="hidden md:flex">
                <DesktopPicker {...props} />
            </div>
        </>
    )
}
