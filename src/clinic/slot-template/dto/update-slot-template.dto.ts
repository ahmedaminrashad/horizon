import { PartialType } from '@nestjs/swagger';
import { CreateSlotTemplateDto } from './create-slot-template.dto';

export class UpdateSlotTemplateDto extends PartialType(CreateSlotTemplateDto) {}
