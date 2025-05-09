import { Skeleton } from '~/components/core/skeleton'
import { formatPercent } from '~/utils/calculate-percentage-change'

export function EcosystemsMarketShare({
  marketShare,
}: { marketShare: number | undefined }) {
  if (marketShare === undefined) {
    return <Skeleton className="my-[3px] ml-auto h-[14px] w-36" />
  }

  return (
    <div className="text-xs font-medium text-[--ecosystem-primary]">
      {formatPercent(marketShare)} market share
    </div>
  )
}
