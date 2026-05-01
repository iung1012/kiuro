import { Space, Switch, Tag, Typography } from 'antd'

import {
  CHATGPT_REGISTRATION_MODE_ACCESS_TOKEN_ONLY,
  CHATGPT_REGISTRATION_MODE_REFRESH_TOKEN,
  type ChatGPTRegistrationMode,
} from '@/lib/chatgptRegistrationMode'

const { Text } = Typography

type ChatGPTRegistrationModeSwitchProps = {
  mode: ChatGPTRegistrationMode
  onChange: (mode: ChatGPTRegistrationMode) => void
}

export function ChatGPTRegistrationModeSwitch({
  mode,
  onChange,
}: ChatGPTRegistrationModeSwitchProps) {
  const hasRefreshTokenSolution =
    mode === CHATGPT_REGISTRATION_MODE_REFRESH_TOKEN

  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      <Space align="center" wrap>
        <Switch
          checked={hasRefreshTokenSolution}
          checkedChildren="Com RT"
          unCheckedChildren="Sem RT"
          onChange={(checked) =>
            onChange(
              checked
                ? CHATGPT_REGISTRATION_MODE_REFRESH_TOKEN
                : CHATGPT_REGISTRATION_MODE_ACCESS_TOKEN_ONLY,
            )
          }
        />
        <Tag color={hasRefreshTokenSolution ? 'success' : 'default'}>
          {hasRefreshTokenSolution ? 'Recomendado' : 'Modo legado'}
        </Tag>
      </Space>
      <Text type="secondary">
        {hasRefreshTokenSolution
          ? 'O modo Com RT usa o novo fluxo PR, gerando Access Token + Refresh Token.'
          : 'O modo Sem RT usa o fluxo legado atual, gerando apenas Access Token / Session; recursos que dependem de RT podem não estar disponíveis.'}
      </Text>
    </Space>
  )
}
