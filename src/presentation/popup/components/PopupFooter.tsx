import React from "react";
import { Card, Separator } from "@heroui/react";

/**
 * Componente visual puramente declarativo para o rodapé do Popup utilizando HeroUI Card.Footer
 * e tokens de texto do tema.
 */
export const PopupFooter: React.FC = () => {
  return (
    <>
      <Separator className="my-2.5" />
      <Card.Footer className="p-0 text-center text-xs text-muted justify-center">
        Desenvolvido por <strong className="">Icaro David</strong>
      </Card.Footer>
    </>
  );
};
