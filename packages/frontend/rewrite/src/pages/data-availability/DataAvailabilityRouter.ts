import type { Router } from 'express'
import type { RenderFunction } from 'rewrite/src/ssr/server'
import { validateRoute } from 'rewrite/src/ssr/validateRoute'
import { z } from 'zod'
import type { Manifest } from '~/utils/Manifest'
import { getDataAvailabilityProjectData } from './project/getDataAvailabilityProjectData'
import { getDataAvailabilityRiskData } from './risk/getDataAvailabilityRiskData'
import { getDataAvailabilitySummaryData } from './summary/getDataAvailabilitySummaryData'
import { getDataAvailabilityThroughputData } from './throughput/getDataAvailabilityThroughputData'

export function DataAvailabilityRouter(
  app: Router,
  manifest: Manifest,
  render: RenderFunction,
) {
  app.get('/data-availability/summary', async (req, res) => {
    const data = await getDataAvailabilitySummaryData(manifest)
    const html = render(data, req.originalUrl)
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  })

  app.get('/data-availability/risk', async (req, res) => {
    const data = await getDataAvailabilityRiskData(manifest)
    const html = render(data, req.originalUrl)
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  })

  app.get('/data-availability/throughput', async (req, res) => {
    const data = await getDataAvailabilityThroughputData(manifest)
    const html = render(data, req.originalUrl)
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  })

  app.get(
    '/data-availability/projects/:layer/:bridge',
    validateRoute({
      params: z.object({
        layer: z.string(),
        bridge: z.string(),
      }),
    }),
    async (req, res) => {
      const data = await getDataAvailabilityProjectData(manifest, req.params)
      if (!data) {
        res.status(404).send('Not found')
        return
      }
      const html = render(data, req.originalUrl)
      res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
    },
  )
}
