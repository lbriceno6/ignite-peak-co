/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación de Nutribatidos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NUTRIBATIDOS</Text>
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa este código para continuar:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          El código caduca en unos minutos. Si no lo solicitaste, ignora este
          mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  letterSpacing: '6px',
  fontWeight: 'bold' as const,
  color: '#141414',
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 8px',
}
const hr = { borderColor: '#e6e6e6', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
