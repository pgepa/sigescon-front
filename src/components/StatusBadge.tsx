import { Badge } from "@/components/ui/badge";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconHourglass,
  IconFileText,
} from "@tabler/icons-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = "md", showIcon = true, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s]/g, '');

    switch (normalizedStatus) {
      case 'aprovado':
      case 'concluido':
      case 'concluida':
      case 'finalizado':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <IconCheck className="w-3 h-3" />,
          label: 'Aprovado'
        };

      case 'rejeitado':
      case 'recusado':
      case 'negado':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <IconX className="w-3 h-3" />,
          label: 'Rejeitado'
        };

      case 'aguardandoanalise':
      case 'aguardandoaprovacao':
      case 'pendenteanalise':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <IconHourglass className="w-3 h-3" />,
          label: 'Aguardando Análise'
        };

      case 'pendente':
      case 'aberto':
      case 'novo':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <IconClock className="w-3 h-3" />,
          label: 'Pendente'
        };

      case 'vencido':
      case 'atrasado':
      case 'ematraso':
        return {
          color: 'bg-red-500 text-white border-red-600 animate-pulse',
          icon: <IconAlertTriangle className="w-3 h-3" />,
          label: 'VENCIDO'
        };

      case 'ativo':
      case 'vigente':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <IconCheck className="w-3 h-3" />,
          label: 'Ativo'
        };

      case 'incorporado':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <IconCheck className="w-3 h-3" />,
          label: 'Incorporado'
        };

      case 'suspenso':
      case 'suspensa':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <IconAlertTriangle className="w-3 h-3" />,
          label: 'Suspenso'
        };

      case 'encerrado':
      case 'encerrada':
        return {
          color: 'bg-gray-200 text-gray-700 border-gray-300',
          icon: <IconClock className="w-3 h-3" />,
          label: 'Encerrado'
        };

      case 'cancelado':
      case 'cancelada':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <IconX className="w-3 h-3" />,
          label: 'Cancelado'
        };

      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <IconFileText className="w-3 h-3" />,
          label: status
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge
      className={`
        ${config.color}
        ${sizeClasses[size]}
        border
        font-medium
        inline-flex
        items-center
        gap-1
        ${className}
      `}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}