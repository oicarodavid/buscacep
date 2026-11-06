import React from "react";
import { Alert } from "@heroui/react";
import { WarningCircle } from "@phosphor-icons/react";

export interface PopupFeedbackProps {
  readonly mensagem: string | null;
}

/**
 * Componente visual puramente declarativo para alertas e feedback utilizando o HeroUI Alert.
 */
export const PopupFeedback: React.FC<PopupFeedbackProps> = ({ mensagem }) => {
  if (!mensagem) return null;

  return (
    <Alert status="danger" className="mt-2 text-xs py-2 px-2.5 shadow-surface">
      <Alert.Indicator>
        <WarningCircle size={16} weight="bold" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title className="text-xs leading-tight font-medium">
          {mensagem}
        </Alert.Title>
      </Alert.Content>
    </Alert>
  );
};
