import type { DaBlob, DaProvider } from '@l2beat/shared'
import { assert, UnixTime } from '@l2beat/shared-pure'
import { Indexer } from '@l2beat/uif'
import type { DaTrackingConfig } from '../../../config/Config'
import { INDEXER_NAMES } from '../../../tools/uif/indexerIdentity'
import { ManagedMultiIndexer } from '../../../tools/uif/multi/ManagedMultiIndexer'
import type {
  Configuration,
  ManagedMultiIndexerOptions,
  RemovalConfiguration,
} from '../../../tools/uif/multi/types'
import type { DaService } from '../../data-availability/services/DaService'

export interface Dependencies
  extends Omit<ManagedMultiIndexerOptions<DaTrackingConfig>, 'name'> {
  daService: DaService
  daProvider: DaProvider
  daLayer: string
  batchSize: number
}

export class DaIndexer extends ManagedMultiIndexer<DaTrackingConfig> {
  configMapping: Map<string, DaTrackingConfig>

  constructor(private readonly $: Dependencies) {
    super({
      ...$,
      name: INDEXER_NAMES.DA,
      tags: { tag: $.daLayer },
      updateRetryStrategy: Indexer.getInfiniteRetryStrategy(),
      configurationsTrimmingDisabled: true,
      dataWipingAfterDeleteDisabled: true,
    })

    assert(
      $.configurations.every((c) => c.properties.daLayer === $.daLayer),
      `DaLayer mismatch detected in configurations`,
    )

    this.configMapping = new Map(
      $.configurations.map((c) => [c.id, c.properties]),
    )
  }

  override async multiUpdate(
    from: number,
    to: number,
    configurations: Configuration<DaTrackingConfig>[],
  ) {
    const adjustedTo =
      from + this.$.batchSize < to ? from + this.$.batchSize : to

    this.logger.info('Fetching blobs', {
      from,
      to: adjustedTo,
    })

    const blobs = await this.$.daProvider.getBlobs(
      this.daLayer,
      from,
      adjustedTo,
    )

    if (blobs.length === 0) {
      this.logger.info('Empty blobs response received', {
        from,
        to: adjustedTo,
      })
      return () => {
        return Promise.resolve(adjustedTo)
      }
    }

    this.logger.info('Fetched blobs', {
      blobs: blobs.length,
    })

    const previousRecords = await this.getPreviousRecordsInBlobsRange(blobs)

    this.logger.info('Loaded previous records', {
      previousRecords: previousRecords.length,
    })

    const records = this.$.daService.generateRecords(
      blobs,
      previousRecords,
      configurations.map((c) => c.properties),
    )

    return async () => {
      await this.$.db.dataAvailability.upsertMany(records)
      this.logger.info('Saved DA metrics into DB', {
        from,
        to: adjustedTo,
        configurations: configurations.length,
        records: records.length,
      })

      return adjustedTo
    }
  }

  private async getPreviousRecordsInBlobsRange(blobs: DaBlob[]) {
    const from = UnixTime.toStartOf(
      Math.min(...blobs.map((b) => b.blockTimestamp)),
      'day',
    )

    const to = UnixTime.toEndOf(
      Math.max(...blobs.map((b) => b.blockTimestamp)),
      'day',
    )

    return await this.$.db.dataAvailability.getForDaLayerInTimeRange(
      this.$.daLayer,
      from,
      to,
    )
  }

  // Assumptions:
  // This indexer will never invalidate (Parent goes only forward, no reorg support)
  // This indexer does not support trimming, if configuration has changed all data will be wiped
  override async removeData(
    configurations: RemovalConfiguration[],
  ): Promise<void> {
    //this function should only run with this flag enabled
    assert(this.options.configurationsTrimmingDisabled)

    for (const c of configurations) {
      const configuration = this.configMapping.get(c.id)

      assert(configuration, `${c.id}: No configuration found`)

      const deletedRecords = await this.$.db.dataAvailability.deleteByProject(
        configuration.projectId,
        configuration.daLayer,
      )

      this.logger.info('Wiped DA records for configuration', {
        id: c.id,
        project: configuration.projectId.toString(),
        daLayer: configuration.daLayer,
        deletedRecords,
      })
    }
  }

  get daLayer() {
    return this.$.daLayer
  }
}
