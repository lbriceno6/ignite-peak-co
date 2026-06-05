import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Nutribatidos'
const APP_URL = 'https://ignite-peak-co.lovable.app'

interface Props {
  businessName?: string
  status?: 'approved' | 'rejected' | 'suspended'
  reason?: string | null
}

const COPY: Record<string, { title: string; intro: string; cta: string; href: string }> = {
  approved: {
    title: '¡Tu tienda fue aprobada!',
    intro: 'Tu marca ya está activa en el marketplace. Puedes empezar a publicar productos y gestionar pedidos.',
    cta: 'Ir al panel de proveedor',
    href: `${APP_URL}/supplier`,
  },
  rejected: {
    title: 'Tu solicitud fue revisada',
    intro: 'Por ahora tu solicitud no fue aprobada. Revisa el motivo, ajusta los datos y reenvía tu solicitud cuando estés listo.',
    cta: 'Revisar y reenviar',
    href: `${APP_URL}/supplier`,
  },
  suspended: {
    title: 'Tu cuenta fue suspendida',
    intro: 'Tu cuenta de proveedor está temporalmente suspendida. Contáctanos para resolver el estado.',
    cta: 'Abrir panel',
    href: `${APP_URL}/supplier`,
  },
}

const SupplierStatusUpdate = ({ businessName, status = 'approved', reason }: Props) => {
  const copy = COPY[status] ?? COPY.approved
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{copy.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{copy.title}</Heading>
          <Text style={text}>Hola{businessName ? `, equipo de ${businessName}` : ''}.</Text>
          <Text style={text}>{copy.intro}</Text>
          {status === 'rejected' && reason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Motivo</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={copy.href}>{copy.cta}</Button>
          </Section>
          <Text style={footer}>— Equipo {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SupplierStatusUpdate,
  subject: (data: Record<string, any>) => {
    const s = (data?.status as string) ?? 'approved'
    if (s === 'approved') return `${SITE_NAME}: tu tienda fue aprobada`
    if (s === 'rejected') return `${SITE_NAME}: actualización de tu solicitud`
    if (s === 'suspended') return `${SITE_NAME}: tu cuenta fue suspendida`
    return `${SITE_NAME}: actualización de tu cuenta`
  },
  displayName: 'Estado de proveedor',
  previewData: { businessName: 'Marca Ejemplo', status: 'approved' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.55', margin: '0 0 14px' }
const reasonBox = { background: '#fff5f5', border: '1px solid #f3c2c2', borderRadius: '8px', padding: '14px 16px', margin: '12px 0' }
const reasonLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#b42318', margin: '0 0 4px' }
const reasonText = { fontSize: '13px', color: '#444', margin: 0 }
const button = { background: '#0f0f0f', color: '#fff', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
