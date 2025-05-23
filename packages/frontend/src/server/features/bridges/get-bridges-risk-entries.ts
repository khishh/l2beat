import type {
  BridgeCategory,
  Project,
  ProjectBridgeRisks,
  Sentiment,
} from '@l2beat/config'
import { ps } from '~/server/projects'
import type { ProjectChanges } from '../projects-change-report/get-projects-change-report'
import { getProjectsChangeReport } from '../projects-change-report/get-projects-change-report'
import { getProjectsLatestTvsUsd } from '../scaling/tvs/get-latest-tvs-usd'
import { compareTvs } from '../scaling/tvs/utils/compare-tvs'
import type { CommonBridgesEntry } from './get-common-bridges-entry'
import { getCommonBridgesEntry } from './get-common-bridges-entry'

export async function getBridgesRiskEntries() {
  const [tvs, projectsChangeReport, projects] = await Promise.all([
    getProjectsLatestTvsUsd(),
    getProjectsChangeReport(),
    ps.getProjects({
      select: ['statuses', 'bridgeInfo', 'bridgeRisks'],
      where: ['isBridge'],
      whereNot: ['isUpcoming', 'archivedAt'],
    }),
  ])

  return projects
    .map((project) =>
      getBridgesRiskEntry(
        project,
        projectsChangeReport.getChanges(project.id),
        tvs[project.id],
      ),
    )
    .sort(compareTvs)
}

export interface BridgesRiskEntry extends CommonBridgesEntry {
  type: BridgeCategory
  destination: {
    value: string
    description?: string
    sentiment: Sentiment
  }
  riskView: ProjectBridgeRisks
  tvsOrder: number
}

function getBridgesRiskEntry(
  project: Project<'statuses' | 'bridgeInfo' | 'bridgeRisks'>,
  changes: ProjectChanges,
  tvs: number | undefined,
) {
  return {
    ...getCommonBridgesEntry({ project, changes }),
    type: project.bridgeInfo.category,
    destination: getDestination(project.bridgeInfo.destination),
    riskView: project.bridgeRisks,
    tvsOrder: tvs ?? -1,
  }
}

function getDestination(destinations: string[]): {
  value: string
  description?: string
  sentiment: Sentiment
} {
  if (destinations.length === 0) {
    throw new Error('Invalid destination')
  }
  if (destinations.length === 1 && destinations[0]) {
    return { value: destinations[0], sentiment: 'neutral' }
  }
  return {
    value: 'Various',
    description: destinations.join(',\n'),
    sentiment: 'neutral',
  }
}
