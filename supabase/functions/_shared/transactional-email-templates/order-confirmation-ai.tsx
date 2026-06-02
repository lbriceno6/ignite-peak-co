import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Voltra Nutrition'
const APP_URL = 'https://ignite-peak-co.lovable.app'

type Item = {
  name: string
  variant?: string | null
  quantity: number
  unit_price: number
  image?: string | null
}

type Pick = {
  slug: string
  name: string
  reason?: string
  price?: number | null
  image?: string | null
}

interface Props {
  customerName?: string
  orderCode?: string
  total?: number
  currency?: string
  items?: Item[]
  thankYou?: string
  picks?: Pick[]
  reorderDays?: number | null
  orderUrl?: string
}

const fmt = (n: number, cur = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: cur }).format(n)

const OrderConfirmationAi = ({
  customerName,
  orderCode = '',
  total = 0,
  currency = 'PEN',
  items = [],
  thankYou,
  picks = [],
  reorderDays,
  orderUrl,
}: Props) => {
  const href = orderUrl || `${APP_URL}/my-orders`
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Pedido {orderCode} confirmado — gracias por tu compra</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>¡Gracias{customerName ? `, ${customerName}` : ''}!</Heading>
          <Text style={text}>
            {thankYou || 'Tu pedido fue recibido y lo estamos preparando con cuidado.'}
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Pedido</Text>
            <Text style={cardCode}>{orderCode}</Text>
            <Hr style={hr} />
            {items.map((it, i) => (
              <Section key={i} style={{ margin: '8px 0' }}>
                <Text style={itemName}>
                  {it.quantity} × {it.name}
                  {it.variant ? ` · ${it.variant}` : ''}
                </Text>
                <Text style={itemPrice}>{fmt(it.unit_price * it.quantity, currency)}</Text>
              </Section>
            ))}
            <Hr style={hr} />
            <Section>
              <Text style={totalRow}>Total: <b>{fmt(total, currency)}</b></Text>
            </Section>
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={href}>Ver mi pedido</Button>
          </Section>

          {picks.length > 0 && (
            <Section style={{ margin: '28px 0 8px' }}>
              <Heading style={h2}>Sigue avanzando</Heading>
              <Text style={text}>Selección IA en función de lo que compraste:</Text>
              {picks.slice(0, 4).map((p) => (
                <Section key={p.slug} style={pickBox}>
                  {p.image && (
                    <Img src={p.image} alt={p.name} width="64" height="64" style={pickImg} />
                  )}
                  <Text style={pickName}>{p.name}</Text>
                  {p.reason && <Text style={pickReason}>{p.reason}</Text>}
                  <Button style={pickBtn} href={`${APP_URL}/product/${p.slug}`}>
                    Ver producto{p.price ? ` · ${fmt(p.price, currency)}` : ''}
                  </Button>
                </Section>
              ))}
            </Section>
          )}

          {reorderDays && (
            <Text style={hint}>
              💡 A este ritmo, te durarán unos {reorderDays} días. Activa una suscripción
              para no quedarte sin stock.
            </Text>
          )}

          <Text style={footer}>— Equipo {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderConfirmationAi,
  subject: (data: Record<string, any>) => {
    const code = data?.orderCode ? ` ${data.orderCode}` : ''
    return `${SITE_NAME}: pedido${code} confirmado`
  },
  displayName: 'Confirmación de pedido (IA)',
  previewData: {
    customerName: 'Ana',
    orderCode: 'VN-2024-0001',
    total: 189.5,
    currency: 'PEN',
    items: [
      { name: 'Proteína Whey', variant: 'Chocolate · 1 kg', quantity: 1, unit_price: 129.5 },
      { name: 'Shaker', quantity: 2, unit_price: 30 },
    ],
    thankYou: 'Gracias por tu pedido. Estás un paso más cerca de tu objetivo.',
    picks: [
      { slug: 'creatina-monohidrato', name: 'Creatina Monohidrato', reason: 'Complementa tu rutina', price: 79 },
      { slug: 'multivitaminico', name: 'Multivitamínico', reason: 'Refuerza tu energía', price: 49 },
    ],
    reorderDays: 30,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 14px' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 10px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.55', margin: '0 0 14px' }
const card = { background: '#fafafa', border: '1px solid #ececec', borderRadius: '10px', padding: '18px 18px', margin: '12px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#999', margin: '0 0 4px' }
const cardCode = { fontSize: '16px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 8px' }
const hr = { borderColor: '#ececec', margin: '10px 0' }
const itemName = { fontSize: '13px', color: '#333', margin: '0 0 2px' }
const itemPrice = { fontSize: '13px', color: '#666', margin: 0 }
const totalRow = { fontSize: '15px', color: '#0f0f0f', margin: '6px 0 0' }
const button = { background: '#0f0f0f', color: '#fff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const pickBox = { border: '1px solid #ececec', borderRadius: '8px', padding: '12px 14px', margin: '8px 0' }
const pickImg = { borderRadius: '6px', marginBottom: '6px' }
const pickName = { fontSize: '14px', fontWeight: 'bold', color: '#0f0f0f', margin: '0 0 2px' }
const pickReason = { fontSize: '12px', color: '#777', margin: '0 0 8px' }
const pickBtn = { background: '#fff', color: '#0f0f0f', border: '1px solid #0f0f0f', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', display: 'inline-block' }
const hint = { fontSize: '13px', color: '#555', background: '#fff8e6', border: '1px solid #f3e2a8', borderRadius: '8px', padding: '12px 14px', margin: '14px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
