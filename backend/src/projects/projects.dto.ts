import { IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(20)
  name!: string;
}

export class UpdateProjectDto {
  @IsString()
  @MaxLength(20)
  name!: string;
}
