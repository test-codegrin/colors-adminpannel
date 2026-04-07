"use client";

import type { BetaPlan } from "@/types/betaPlans.types";

import {
  Avatar,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

import Loader from "@/components/Loader";
import { getBetaPlanById } from "@/api/betaPlans.api";

function getInitials(name?: string): string {
  if (!name) return "U";

  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface Props {
  isOpen: boolean;
  onOpenChange: () => void;
  betaPlanId: number | null;
}

export default function BetaPlanModal({
  isOpen,
  onOpenChange,
  betaPlanId,
}: Props) {
  const [betaPlan, setBetaPlan] = useState<BetaPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!betaPlanId) return;

    const fetchBetaPlan = async () => {
      try {
        setIsLoading(true);
        const data = await getBetaPlanById(betaPlanId);

        setBetaPlan(data);
      } catch (error) {
        console.error("Failed to load beta plan", error);
        setBetaPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBetaPlan();
  }, [betaPlanId]);

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      isDismissable={false}
      isOpen={isOpen}
      placement="center"
      size="md"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Beta Plan Details</h3>
              <Button
                isIconOnly
                radius="full"
                variant="light"
                onPress={onClose}
              >
                <Icon className="w-5 h-5" icon="mdi:close" />
              </Button>
            </ModalHeader>

            <ModalBody className="py-5">
              {isLoading ? (
                <Loader />
              ) : betaPlan ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Avatar
                      className="w-20 h-20 text-white text-xl font-semibold"
                      color="primary"
                      name={getInitials(betaPlan.name)}
                      radius="full"
                    />
                  </div>

                  <Input
                    isReadOnly
                    label="Beta Claim ID"
                    value={String(betaPlan.beta_claim_id)}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="User ID"
                    value={String(betaPlan.user_id)}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="Full Name"
                    value={betaPlan.name ?? "-"}
                    variant="flat"
                  />

                  <Input
                    isReadOnly
                    label="Email"
                    value={betaPlan.email ?? "-"}
                    variant="flat"
                  />
                </div>
              ) : (
                <div className="text-center text-default-400 py-6">
                  No beta plan found
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
