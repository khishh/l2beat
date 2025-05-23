import type { WarningWithSentiment } from '@l2beat/config'
import type { UnixTime } from '@l2beat/shared-pure'
import { NoDataBadge } from '~/components/badge/no-data-badge'
import { ValueSecuredBreakdown } from '~/components/breakdown/value-secured-breakdown'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/core/tooltip/tooltip'
import { VerticalSeparator } from '~/components/core/vertical-separator'
import { CustomLink } from '~/components/link/custom-link'
import { Square } from '~/components/square'
import { ValueWithPercentageChange } from '~/components/table/cells/value-with-percentage-change'
import { RoundedWarningIcon } from '~/icons/rounded-warning'
import type { ProjectScalingEntry } from '~/server/features/scaling/project/get-scaling-project-entry'
import { cn } from '~/utils/cn'
import { unifyPercentagesAsIntegers } from '~/utils/math'
import { formatCurrency } from '~/utils/number-format/format-currency'

interface ValueSecuredBreakdown {
  totalChange: number
  total: number
  canonical: number
  external: number
  native: number
  warning: WarningWithSentiment | undefined
}

export interface ValueSecuredSummaryProps {
  tvs: NonNullable<ProjectScalingEntry['header']['tvs']> | undefined
  detailedBreakdownHref: string
  archivedAt?: UnixTime | undefined
}

export function ValueSecuredSummary(props: ValueSecuredSummaryProps) {
  const params = getParams(props.tvs)

  const tvsStats = [
    {
      label: 'Canonically Bridged',
      shortLabel: 'Canonical',
      value: formatCurrency(params.breakdown.canonical, 'usd'),
      usage: params.usage.canonical,
      icon: <Square variant="canonical" size="small" />,
    },
    {
      label: 'Natively Minted',
      shortLabel: 'Native',
      value: formatCurrency(params.breakdown.native, 'usd'),
      usage: params.usage.native,
      icon: <Square variant="native" size="small" />,
    },
    {
      label: 'Externally Bridged',
      shortLabel: 'External',
      value: formatCurrency(params.breakdown.external, 'usd'),
      usage: params.usage.external,
      icon: <Square variant="external" size="small" />,
    },
  ]

  return (
    <div
      className={cn(
        'md:col-span-2 md:grid md:grid-cols-[1fr_1px_1fr] md:gap-x-8 md:gap-y-4 md:rounded-lg md:bg-header-secondary md:p-6',
        '[@media(min-width:1000px)]:col-span-1 [@media(min-width:1000px)]:flex [@media(min-width:1000px)]:flex-col',
      )}
    >
      <div className="flex w-full flex-wrap items-baseline justify-between md:gap-2">
        <span className="text-lg font-medium md:hidden md:text-xs md:font-normal md:text-gray-500 md:dark:text-gray-600">
          Value secured
        </span>
        <span className="hidden text-lg font-bold text-secondary md:block md:text-xs md:font-normal">
          TVS
        </span>

        <div className="flex items-center gap-1">
          {params.breakdown.total > 0 || !!props.archivedAt ? (
            <ValueWithPercentageChange
              className="text-lg font-bold md:text-2xl md:leading-none"
              changeClassName="text-xs font-bold md:text-base md:w-[58px]"
              change={params.breakdown.totalChange}
            >
              {formatCurrency(params.breakdown.total, 'usd')}
            </ValueWithPercentageChange>
          ) : (
            <NoDataBadge />
          )}
          {props.tvs?.warning ? (
            <Tooltip>
              <TooltipTrigger>
                <RoundedWarningIcon
                  className="size-4"
                  sentiment={props.tvs.warning.sentiment}
                />
              </TooltipTrigger>
              <TooltipContent>{props.tvs.warning.value}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <ValueSecuredBreakdown
          canonical={params.usage.canonical}
          external={params.usage.external}
          native={params.usage.native}
          className="my-3 hidden h-1 w-full md:my-0 md:flex [@media(min-width:1000px)]:hidden"
        />
      </div>
      <ValueSecuredBreakdown
        canonical={params.usage.canonical}
        external={params.usage.external}
        native={params.usage.native}
        className="my-3 h-1 w-full md:my-0 md:hidden [@media(min-width:1000px)]:flex"
      />
      <VerticalSeparator className="row-span-2 hidden w-px max-md:border-none md:block [@media(min-width:1000px)]:hidden" />
      <div className="row-span-2 flex h-1/2 flex-wrap gap-3 @container md:h-full md:gap-0 [@media(min-width:1000px)]:h-1/2">
        {tvsStats.map((s, i) => (
          <div
            key={i}
            className="flex w-full flex-nowrap items-center justify-between gap-1"
          >
            <div className="flex items-center gap-1">
              {s.icon}
              <span className="text-xs leading-none text-secondary">
                <span className="inline md:hidden">{s.label}</span>
                <span className="hidden md:inline">{s.shortLabel}</span>
              </span>
            </div>
            <span className="whitespace-nowrap text-base font-medium leading-none">
              {s.value}
              {params.breakdown.total > 0 && (
                <span className="hidden w-[54px] text-right font-normal text-secondary @[210px]:inline-block">
                  {` (${s.usage}%)`}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {params.breakdown.total > 0 ? (
        <div className="mt-2 flex justify-center md:mt-0">
          <CustomLink href={props.detailedBreakdownHref} className="text-xs">
            View TVS Breakdown
          </CustomLink>
        </div>
      ) : null}
    </div>
  )
}

function getParams(tvs: ValueSecuredSummaryProps['tvs']) {
  if (!tvs?.breakdown) {
    return {
      breakdown: {
        total: 0,
        canonical: 0,
        external: 0,
        native: 0,
        totalChange: 0,
      },
      usage: {
        canonical: 1,
        external: 1,
        native: 1,
      },
    }
  }

  const [canonical, external, native] = unifyPercentagesAsIntegers([
    tvs.breakdown.total === 0
      ? 100 / 3
      : (tvs.breakdown.canonical / tvs.breakdown.total) * 100,
    tvs.breakdown.total === 0
      ? 100 / 3
      : (tvs.breakdown.external / tvs.breakdown.total) * 100,
    tvs.breakdown.total === 0
      ? 100 / 3
      : (tvs.breakdown.native / tvs.breakdown.total) * 100,
  ] as const)

  return {
    breakdown: tvs.breakdown,
    usage: {
      canonical,
      external,
      native,
    },
  }
}
