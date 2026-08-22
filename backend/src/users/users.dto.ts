import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UserStatusDto {
  @IsBoolean()
  enabled!: boolean;
}
