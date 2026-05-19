/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as supplierStatusUpdate } from './supplier-status-update.tsx'
import { template as adminSupplierEvent } from './admin-supplier-event.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'supplier-status-update': supplierStatusUpdate,
  'admin-supplier-event': adminSupplierEvent,
}
