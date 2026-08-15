/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña de Nutribatidos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NUTRIBATIDOS</Text>
        <Heading style={h1}>Restablece tu contraseña</Heading>
        <Text style={text}>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en
          Nutribatidos. Haz clic en el botón para elegir una nueva.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Crear nueva contraseña
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Si no solicitaste el cambio, ignora este mensaje: tu contraseña
          seguirá siendo la misma.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
}
const container = {
  padding: '32px',
  maxWidth: '560px',
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
}
const brand = {
  fontSize: '12px',
  letterSpacing: '2px',
  fontWeight: 'bold' as const,
  color: '#b8860b',
  margin: '0 0 20px',
}
const h1 = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#141414',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#141414',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '13px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e6e6e6', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
