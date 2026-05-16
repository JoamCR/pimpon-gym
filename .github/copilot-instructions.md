# GitHub Copilot — Instrucciones del Proyecto Pimpon
# Archivo: pimpon-gym/.github/copilot-instructions.md
# Copilot lee este archivo automáticamente en cada sesión

## Contexto del proyecto
Este es "Pimpon Gym System", un sistema de gestión para un gimnasio en México.

## Stack tecnológico obligatorio
- Frontend: React 18 + Vite + Tailwind CSS + Framer Motion
- Backend: Node.js 20 + Fastify (NO Express) + Zod
- Base de datos: PostgreSQL con node-postgres (pg), sin ORM
- Estado frontend: TanStack Query + Zustand
- PDF: pdf-lib (sin microservicios Python)
- Testing: Vitest + Supertest

## Reglas de código que siempre debes seguir

### Backend
- Cada módulo tiene EXACTAMENTE 4 archivos: routes, service, repository, schema
- NUNCA poner queries SQL en service.js — van en repository.js
- NUNCA poner lógica de negocio en routes.js — va en service.js
- SIEMPRE validar con Zod antes de llamar al service
- SIEMPRE async/await, nunca .then()
- SIEMPRE usar AppError de src/lib/appError.js, nunca throw new Error()
- PKs son UUID con gen_random_uuid(), nunca INTEGER
- Comentarios en español

### Frontend
- NUNCA crear componentes de tarjeta nuevos — usar GymCard de src/components/ui/
- NUNCA crear modales nuevos — usar GymModal de src/components/ui/
- NUNCA crear botones nuevos — usar GymButton de src/components/ui/
- NUNCA hacer fetch directo en componentes — usar custom hooks con TanStack Query
- Los hooks van en src/hooks/ con nombre use[Nombre].js

### Base de datos
- snake_case en nombres de tablas y columnas
- Siempre usar transacciones para operaciones que tocan múltiples tablas
- El campo status de subscriptions: 'active'|'expired'|'cancelled'|'pending'
- Cliente "activo" = status='active' AND end_date >= NOW()

## Reglas de negocio críticas
- Tope transferencias $30,000/mes: advertir pero NO bloquear
- Primera consulta nutricional: gratis (first_consult_used=false), luego de pago
- Plan semanal = 6 días exactos
- Incentivos para consecutive_months >= 7
- Módulo de nutriología: solo roles nutritionist y owner

## Componentes UI disponibles
GymCard(title, subtitle, children, variant, action, noPad, delay)
  variant: "default"|"warning"|"danger"|"success"|"gold"

GymModal(isOpen, onClose, title, children, width)
  - backdrop oscuro que bloquea el fondo
  - animación spring de entrada
  - cierre con Escape

GymButton(children, variant, size, onClick, icon, loading, disabled)
  variant: "primary"|"secondary"|"danger"|"warning"|"ghost"|"success"|"gold"
  size: "xs"|"sm"|"md"|"lg"

## Colores del sistema (usar estos, no inventar)
Navy:    #0D1B2A  (sidebar, headers)
Teal:    #0F3E60  (botón primario, acentos)
Gold:    #E29A00  (plan Pro, incentivos, advertencias)
Surface: #F0F5FA  (fondo general)
Green:   #16A34A  (éxito, activo)
Red:     #DC2626  (error, vencido)
Amber:   #D97706  (advertencia)
