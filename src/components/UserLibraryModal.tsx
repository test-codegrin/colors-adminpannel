import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Tab,
  Tabs,
} from "@heroui/react";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import api from "@/lib/axios";

interface LibraryColor {
  colors_id: number;
  hex_code: string;
  color_name: string;
}

interface LibraryGradient {
  gradients_id: number;
  gradient_name: string;
  gradient_code: string;
}

interface LibraryPalette {
  palettes_id: number;
  palette_code: string;
}

interface LibraryCounts {
  palettes: number;
  colors: number;
  gradients: number;
}

interface UserLibraryData {
  user: { user_id: number };
  counts: LibraryCounts;
  colors: LibraryColor[];
  gradients: LibraryGradient[];
  palettes: LibraryPalette[];
}

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  userName?: string;
}

function getArrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getCountValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeUserLibraryData(payload: unknown): UserLibraryData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const colors = getArrayValue<LibraryColor>(
    source.colors ?? source.saved_colors,
  );
  const gradients = getArrayValue<LibraryGradient>(
    source.gradients ?? source.saved_gradients,
  );
  const palettes = getArrayValue<LibraryPalette>(
    source.palettes ?? source.saved_palettes,
  );
  const countsSource =
    source.counts && typeof source.counts === "object"
      ? (source.counts as Record<string, unknown>)
      : {};
  const user =
    source.user && typeof source.user === "object"
      ? (source.user as { user_id: number })
      : { user_id: 0 };

  return {
    user,
    colors,
    gradients,
    palettes,
    counts: {
      colors: getCountValue(countsSource.colors, colors.length),
      gradients: getCountValue(countsSource.gradients, gradients.length),
      palettes: getCountValue(countsSource.palettes, palettes.length),
    },
  };
}

function parseGradientColors(code: string): string[] {
  return code.split("-").map((c) => (c.startsWith("#") ? c : `#${c}`));
}

function parsePaletteColors(code: string): string[] {
  return code.split("-").map((c) => (c.startsWith("#") ? c : `#${c}`));
}

export default function UserLibraryModal({
  isOpen,
  onOpenChange,
  userId,
  userName,
}: Props) {
  const [data, setData] = useState<UserLibraryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("colors");

  useEffect(() => {
    if (!isOpen || !userId) return;
    setData(null);
    setError("");
    setIsLoading(true);
    setActiveTab("colors");

    api
      .get(`/admin/users/${userId}/library`)
      .then((res) => {
        const payload = res.data;
        const d = payload?.data ?? payload;
        const normalizedData = normalizeUserLibraryData(d);

        if (!normalizedData) {
          throw new Error("Invalid library response");
        }

        setData(normalizedData);
      })
      .catch(() => setError("Failed to load library data."))
      .finally(() => setIsLoading(false));
  }, [isOpen, userId]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      placement="center"
      scrollBehavior="inside"
      classNames={{ base: "overflow-hidden" }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* Header */}
            <ModalHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">User Library</span>
                {userName && (
                  <span className="text-sm font-normal text-default-500">
                    ({userName})
                  </span>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="px-0 py-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner label="Loading library..." />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              ) : data ? (
                <>
                  {/* Counts */}
                  <div className="grid grid-cols-3 border-b border-default-200">
                    {[
                      {
                        label: "Colors",
                        count: data.counts.colors,
                        icon: "mdi:palette",
                      },
                      {
                        label: "Gradients",
                        count: data.counts.gradients,
                        icon: "mdi:gradient-horizontal",
                      },
                      {
                        label: "Palettes",
                        count: data.counts.palettes,
                        icon: "mdi:view-grid",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center py-4 gap-1"
                      >
                        <Icon
                          icon={item.icon}
                          width={20}
                          className="text-[#7C3AED]"
                        />
                        <p className="text-lg font-bold text-foreground">
                          {item.count}
                        </p>
                        <p className="text-xs text-default-500">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabs */}
                  <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(k) => setActiveTab(String(k))}
                    variant="underlined"
                    color="secondary"
                    classNames={{
                      base: "w-full px-4 pt-2",
                      tabList: "w-full",
                      tab: "flex-1",
                    }}
                  >
                    <Tab key="colors" title="Colors">
                      <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
                        {data.colors.length === 0 ? (
                          <p className="text-center text-sm text-default-500 py-8">
                            No colors saved
                          </p>
                        ) : (
                          data.colors.map((c) => (
                            <div
                              key={c.colors_id}
                              className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 px-4 py-3"
                            >
                              <div
                                className="h-8 w-8 rounded-lg shrink-0 border border-default-200"
                                style={{ backgroundColor: c.hex_code }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {c.color_name}
                                </p>
                                <p className="text-xs text-default-500 font-mono">
                                  {c.hex_code}
                                </p>
                              </div>
                              <span className="ml-auto text-xs text-default-400">
                                #{c.colors_id}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </Tab>

                    <Tab key="gradients" title="Gradients">
                      <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
                        {data.gradients.length === 0 ? (
                          <p className="text-center text-sm text-default-500 py-8">
                            No gradients saved
                          </p>
                        ) : (
                          data.gradients.map((g) => {
                            const colors = parseGradientColors(g.gradient_code);
                            return (
                              <div
                                key={g.gradients_id}
                                className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 px-4 py-3"
                              >
                                <div
                                  className="h-8 w-8 rounded-lg shrink-0 border border-default-200"
                                  style={{
                                    background: `linear-gradient(135deg, ${colors.join(", ")})`,
                                  }}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    {g.gradient_name}
                                  </p>
                                  <p className="text-xs text-default-500 font-mono">
                                    {g.gradient_code}
                                  </p>
                                </div>
                                <span className="ml-auto text-xs text-default-400">
                                  #{g.gradients_id}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Tab>

                    <Tab key="palettes" title="Palettes">
                      <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
                        {data.palettes.length === 0 ? (
                          <p className="text-center text-sm text-default-500 py-8">
                            No palettes saved
                          </p>
                        ) : (
                          data.palettes.map((p) => {
                            const colors = parsePaletteColors(p.palette_code);
                            return (
                              <div
                                key={p.palettes_id}
                                className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 px-4 py-3"
                              >
                                <div className="flex h-8 w-16 rounded-lg overflow-hidden shrink-0 border border-default-200">
                                  {colors.map((color, i) => (
                                    <div
                                      key={i}
                                      className="flex-1 h-full"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-default-500 font-mono break-all">
                                    {p.palette_code}
                                  </p>
                                </div>
                                <span className="ml-auto text-xs text-default-400">
                                  #{p.palettes_id}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Tab>
                  </Tabs>
                </>
              ) : null}
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" fullWidth onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
