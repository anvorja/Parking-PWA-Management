// src/components/ui/calendar.tsx
// Calendario estilo Google Calendar — react-day-picker v9 + Tailwind
// Locale ES: semana empieza el lunes, nombres en español

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            locale={es}
            weekStartsOn={1}
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months:         "flex flex-col",
                month:          "space-y-3",
                month_caption:  "flex items-center justify-between px-1 pb-1",
                caption_label:  "text-[14px] font-semibold text-slate-800 capitalize cursor-pointer select-none",
                nav:            "flex items-center gap-1",
                button_previous: cn(
                    "h-7 w-7 flex items-center justify-center rounded-full",
                    "text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                ),
                button_next: cn(
                    "h-7 w-7 flex items-center justify-center rounded-full",
                    "text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                ),
                month_grid:     "w-full border-collapse",
                weekdays:       "flex",
                weekday:        "w-9 text-[11px] font-semibold text-slate-400 text-center uppercase",
                week:           "flex mt-1",
                day:            "p-0",
                day_button: cn(
                    "h-9 w-9 flex items-center justify-center rounded-full text-[13px] font-medium",
                    "text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer select-none",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                ),
                selected:       "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-bold",
                today:          "[&>button]:ring-2 [&>button]:ring-blue-400 [&>button]:ring-offset-1 [&>button]:font-bold",
                outside:        "[&>button]:text-slate-300",
                disabled:       "[&>button]:text-slate-200 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent",
                hidden:         "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === "left"
                        ? <ChevronLeft className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}
