import type { GameScoreUserDetail } from "@/types/gameScore.types";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

import {
  getGameScoreErrorMessage,
  getGameScoreUsersDetails,
} from "@/api/gameScore.api";

function GameScore() {
  const [rows, setRows] = useState<GameScoreUserDetail[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadGameScores = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getGameScoreUsersDetails();
      setRows(result.data);
    } catch (fetchError) {
      const message = getGameScoreErrorMessage(fetchError);

      setError(message);
      setRows([]);
      addToast({
        title: "Load Failed",
        description: message,
        severity: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGameScores();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / limit));

    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [limit, page, rows.length]);

  const totalUsersLabel =
    rows.length === 1
      ? "1 user score"
      : `${rows.length.toLocaleString()} user scores`;
  const maxHighestScore = rows.reduce(
    (maxValue, row) => Math.max(maxValue, row.highestscore),
    0,
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  return (
    <Card shadow="md">
      <CardBody className="gap-6 p-4 sm:p-6">

        {/* ✅ Header Responsive */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">
                Game Score
              </h2>

              <Chip
                color={rows.length > 0 ? "primary" : "default"}
                size="sm"
                variant="flat"
              >
                {totalUsersLabel}
              </Chip>

              <Chip
                color={maxHighestScore > 0 ? "success" : "default"}
                size="sm"
                variant="flat"
              >
                Top score: {maxHighestScore.toLocaleString()}
              </Chip>
            </div>

            <p className="text-sm text-default-500">
              Scores from `/admin/scores/users/details`
            </p>
          </div>

          {/* Refresh */}
          <div className="flex justify-start lg:justify-end">
            <Button
              isLoading={isLoading}
              startContent={
                !isLoading && (
                  <Icon icon="solar:refresh-bold" width={18} />
                )
              }
              variant="flat"
              onPress={loadGameScores}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {/* ✅ Table Scroll Fix */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <Table
            aria-label="Game score users details table"
            className="min-w-[700px]"
            classNames={{
              base: "min-h-[360px]",
              wrapper:
                "overflow-hidden border border-default-200 shadow-none p-0",
              table: "w-full table-auto",
              th: "bg-default-100 text-[11px] font-semibold uppercase tracking-[0.16em] text-default-600",
              td: "py-4 align-middle",
              emptyWrapper: "py-14 text-default-500",
            }}
          >
            <TableHeader>
              <TableColumn className="w-[28%]">Username</TableColumn>
              <TableColumn className="w-[34%]">User Email</TableColumn>
              <TableColumn className="w-[19%]">Highest Score</TableColumn>
              <TableColumn className="w-[19%]">Current Score</TableColumn>
            </TableHeader>

            <TableBody
              emptyContent="No game score data found."
              isLoading={isLoading}
              items={paginatedRows}
              loadingContent={<Spinner label="Loading game scores..." />}
            >
              {(item) => (
                <TableRow key={`${item.useremail}-${item.username}`}>

                  <TableCell>
                    <span className="font-medium text-foreground">
                      {item.username || "-"}
                    </span>
                  </TableCell>

                  <TableCell className="break-all">
                    <span className="text-default-700">
                      {item.useremail || "-"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-foreground">
                      {item.highestscore.toLocaleString()}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-default-700">
                      {item.currentscore.toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ✅ Pagination Responsive */}
        {!isLoading && rows.length > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

            {/* Limit */}
            <div className="flex justify-start">
              <Select
                disallowEmptySelection
                className="w-28"
                label="Limit"
                selectedKeys={[String(limit)]}
                size="sm"
                onChange={(event) => {
                  const nextLimit = Number(event.target.value);

                  if (nextLimit !== limit) {
                    setLimit(nextLimit);
                    setPage(1);
                  }
                }}
              >
                <SelectItem key="10">10</SelectItem>
                <SelectItem key="25">25</SelectItem>
                <SelectItem key="50">50</SelectItem>
              </Select>
            </div>

            {/* Pagination */}
            <div className="flex justify-start sm:justify-end w-full">
              <Pagination
                showControls
                color="primary"
                isDisabled={isLoading}
                page={page}
                total={totalPages}
                onChange={setPage}
              />
            </div>
          </div>
        ) : null}

      </CardBody>
    </Card>
  );
}

export default GameScore;

