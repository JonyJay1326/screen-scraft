import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Category, FitMode, PageDoc } from '@screencraft/shared';

export class CreateScreenDto {
  @IsString()
  projectId!: string;

  @IsString()
  name!: string;

  @IsIn(['通用', '工业', '政务', '医疗', '交通', '能源'])
  category!: Category;
}

export class SaveScreenDto {
  @IsString()
  updatedAt!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['通用', '工业', '政务', '医疗', '交通', '能源'])
  category?: Category;

  @IsOptional()
  @IsIn(['center', 'width', 'height', 'stretch'])
  fitMode?: FitMode;

  @IsOptional()
  pages?: PageDoc[];

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class DeployedDto {
  @IsBoolean()
  deployed!: boolean;
}
