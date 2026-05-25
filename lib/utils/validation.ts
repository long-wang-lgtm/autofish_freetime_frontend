import { z } from 'zod'

export const loginSchema = z.object({
  phone_or_email: z.string().min(1, '手机号或邮箱不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

export const registerSchema = z.object({
  phone: z
    .string()
    .length(11, '手机号必须为11位')
    .regex(/^\d{11}$/, '手机号格式不正确'),
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名最多50个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, '密码至少8个字符')
    .regex(/[a-zA-Z]/, '密码必须包含字母')
    .regex(/\d/, '密码必须包含数字'),
  confirm_password: z.string().min(8, '确认密码至少8个字符'),
}).refine((data) => data.password === data.confirm_password, {
  message: '两次输入的密码不一致',
  path: ['confirm_password'],
})

export type LoginData = z.infer<typeof loginSchema>
export type RegisterData = z.infer<typeof registerSchema>