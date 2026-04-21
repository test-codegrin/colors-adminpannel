import type { GameScoreUserDetail } from "@/types/gameScore.types";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
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
import { useEffect, useRef, useState } from "react";

import {
  getGameScoreErrorMessage,
  getGameScoreUsersDetails,
  isGameScoreRequestCancelled,
} from "@/api/gameScore.api";

function GameScore() {
  const [rows, setRows] = useState<GameScoreUserDetail[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadGameScores = async (searchValue?: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError("");

    try {
      const result = await getGameScoreUsersDetails({
        search: searchValue ?? search,
        signal: abortControllerRef.current.signal,
      });

      setRows(result.data ?? []);
    } catch (fetchError) {
      if (isGameScoreRequestCancelled(fetchError)) return;

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

  // Initial load
  useEffect(() => {
    void loadGameScores();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Re-fetch on every search change (live search)
  useEffect(() => {
    void loadGameScores(search);
    setPage(1);
  }, [search]);

  // Keep page in bounds when limit or row count changes
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

        {/* Header */}
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
              size="sm"
              startContent={
                !isLoading && (
                  <Icon icon="solar:refresh-bold" width={16} />
                )
              }
              variant="flat"
              onPress={() => loadGameScores()}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar — live search, no button */}
        <Input
          isClearable
          className="w-full sm:max-w-full"
          placeholder="Search by username or email..."
          size="md"
          startContent={
            <Icon
              className="text-default-400"
              icon="solar:magnifer-linear"
              width={16}
            />
          }
          value={search}
          onClear={() => setSearch("")}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {/* Table */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <Table
            aria-label="Game score users details table"
            className="min-w-[700px]"
            classNames={{
              base: "min-h-[360px]",
              wrapper: "overflow-hidden shadow-none p-0",
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
              emptyContent={
                search
                  ? `No results found for "${search}".`
                  : "No game score data found."
              }
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

        {/* Pagination */}
        {!isLoading && rows.length > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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