import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Nutribatidos'
const APP_URL = 'https://ignite-peak-co.lovable.app'

interface Props {
  businessName?: string
  event?: 'new' | 'resubmit'
  contactEmail?: string
}

const SUBJ: Record<string, string> = {
  new: 'Nueva solicitud de proveedor',
  resubmit: 'Reenvío de solicitud de proveedor',
}

const AdminSupplierEvent = ({ businessName = 'Marca sin nombre', event = 'new', contactEmail }: Props) => {
  const isResubmit = event === 'resubmit'
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{isResubmit ? 'Un proveedor reenvió su solicitud' : 'Nueva solicitud de proveedor pendiente'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{isResubmit ? 'Reenvío de solicitud' : 'Nueva solicitud de proveedor'}</Heading>
          <Text style={text}>
            {isResubmit
              ? `La marca "${businessName}" volvió a enviar su solicitud tras un rechazo.`
              : `La marca "${businessName}" solicitó vender en el marketplace.`}
          </Text>
          {contactEmail && (
            <Section style={infoBox}>
              <Text style={infoLabel}>Contacto</Text>
              <Text style={infoText}>{contactEmail}</Text>
            </Section>
          )}
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={`${APP_URL}/admin/suppliers`}>Revisar en el panel</Button>
          </Section>
          <Text style={footer}>{SITE_NAME} · Notificación interna de administración</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminSupplierEvent,
  subject: (data: Record<string, any>) => {
    const event = (data?.event as string) ?? 'new'
    const base = SUBJ[event] ?? SUBJ.new
    return data?.businessName ? `${base}: ${data.businessName}` : base
  },
  displayName: 'Aviso admin: solicitud de proveedor',
  previewData: { businessName: 'Marca Ejemplo', event: 'new', contactEmail: 'marca@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.55', margin: '0 0 14px' }
const infoBox = { background: '#f6f7f9', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const infoLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#666', margin: '0 0 4px' }
const infoText = { fontSize: '13px', color: '#222', margin: 0 }
const button = { background: '#0f0f0f', color: '#fff', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
