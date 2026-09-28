"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlySaving {
  month: string;
  amount: number;
}

interface InvestmentPerformance {
  id: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  roi: number;
  status: string;
}

interface DashboardChartsProps {
  monthlySavings: MonthlySaving[];
  investmentPerformance?: InvestmentPerformance[];
  showInvestmentChart?: boolean;
}

export default function DashboardCharts({
  monthlySavings,
  investmentPerformance = [],
  showInvestmentChart = true,
}: DashboardChartsProps) {
  return (
    <div
      className={`mt-8 grid gap-6 ${
        showInvestmentChart
          ? "xl:grid-cols-2"
          : "grid-cols-1"
      }`}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Savings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Savings contribution history over time.
          </p>
        </div>

        {monthlySavings.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-gray-500">
            No savings data yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={monthlySavings}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  formatter={(value) => [
                    `৳${Number(
                      value
                    ).toLocaleString()}`,
                    "Savings",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showInvestmentChart && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Investment Performance
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Invested amount compared with current value.
            </p>
          </div>

          {investmentPerformance.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-gray-500">
              No investment data yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    investmentPerformance
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value,
                      name
                    ) => [
                      `৳${Number(
                        value
                      ).toLocaleString()}`,
                      name,
                    ]}
                  />

                  <Bar
                    dataKey="investedAmount"
                    fill="currentColor"
                    opacity={0.35}
                    name="Invested"
                  />

                  <Bar
                    dataKey="currentValue"
                    fill="currentColor"
                    name="Current Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
