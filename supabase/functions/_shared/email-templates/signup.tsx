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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu correo en Nutribatidos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NUTRIBATIDOS</Text>
        <Heading style={h1}>Confirma tu correo</Heading>
        <Text style={text}>
          ¡Gracias por crear tu cuenta en{' '}
          <Link href={siteUrl} style={link}>
            <strong>Nutribatidos</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Confirma tu correo ({recipient}) para activar tu cuenta y empezar a
          comprar.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar mi correo
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Si no creaste esta cuenta, puedes ignorar este mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#141414', textDecoration: 'underline' }
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
