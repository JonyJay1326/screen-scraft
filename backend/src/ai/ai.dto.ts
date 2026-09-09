import type { AiEditorContext, AiEditorPlanRequest } from '@screencraft/shared';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  @IsString()
  baseUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  apiKey?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  textModel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  visionModel!: string;

  @IsBoolean()
  visionEnabled!: boolean;
}

export class AiSettingsTestDto {
  @IsIn(['text', 'vision'])
  capability!: 'text' | 'vision';
}

export class AiEditorPlanDto implements AiEditorPlanRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  screenId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  pageId!: string;

  @IsIn(['selected', 'page', 'screen'])
  scope!: AiEditorPlanRequest['scope'];

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  componentIds!: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  instruction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceAssetId?: string;

  @IsInt()
  @Min(0)
  editorRevision!: number;

  @IsObject()
  context!: AiEditorContext;
}
