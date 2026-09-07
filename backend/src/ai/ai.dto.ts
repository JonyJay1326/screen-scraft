import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class UpsertKbDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  format?: 'md' | 'txt';
}

export class AiSettingsDto {
  @IsString()
  baseUrl!: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsString()
  chatModel!: string;

  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
