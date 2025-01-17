import type {
	IImportChannelRecord,
	IImportMessageRecord,
	IImportRecord,
	IImportUserRecord,
	RocketChatRecordDeleted,
} from '@rocket.chat/core-typings';
import type { IImportDataModel } from '@rocket.chat/model-typings';
import type { Collection, FindCursor, Db, Filter } from 'mongodb';

import { BaseRaw } from './BaseRaw';

export class ImportDataRaw extends BaseRaw<IImportRecord> implements IImportDataModel {
	constructor(db: Db, trash?: Collection<RocketChatRecordDeleted<IImportRecord>>) {
		super(db, 'import_data', trash);
	}

	getAllUsers(): FindCursor<IImportUserRecord> {
		return this.find({ dataType: 'user' }) as FindCursor<IImportUserRecord>;
	}

	getAllMessages(): FindCursor<IImportMessageRecord> {
		return this.find({ dataType: 'message' }) as FindCursor<IImportMessageRecord>;
	}

	getAllChannels(): FindCursor<IImportChannelRecord> {
		return this.find({ dataType: 'channel' }) as FindCursor<IImportChannelRecord>;
	}

	getAllUsersForSelection(): Promise<Array<IImportUserRecord>> {
		return this.find<IImportUserRecord>(
			{
				dataType: 'user',
			},
			{
				projection: {
					'data.importIds': 1,
					'data.username': 1,
					'data.emails': 1,
					'data.deleted': 1,
					'data.type': 1,
				},
			},
		).toArray();
	}

	getAllChannelsForSelection(): Promise<Array<IImportChannelRecord>> {
		return this.find<IImportChannelRecord>(
			{
				'dataType': 'channel',
				'data.t': {
					$ne: 'd',
				},
			},
			{
				projection: {
					'data.importIds': 1,
					'data.name': 1,
					'data.archived': 1,
					'data.t': 1,
				},
			},
		).toArray();
	}

	async checkIfDirectMessagesExists(): Promise<boolean> {
		return (
			(await this.col.countDocuments({
				'dataType': 'channel',
				'data.t': 'd',
			})) > 0
		);
	}

	async countMessages(): Promise<number> {
		return this.col.countDocuments({ dataType: 'message' });
	}

	async findChannelImportIdByNameOrImportId(channelIdentifier: string): Promise<string | undefined> {
		const channel = await this.findOne(
			{
				dataType: 'channel',
				$or: [
					{
						'data.name': channelIdentifier,
					},
					{
						'data.importIds': channelIdentifier,
					},
				],
			},
			{
				projection: {
					'data.importIds': 1,
				},
			},
		);

		// TODO: typings of this model seems to take a ton of shapes
		return (channel?.data as any)?.importIds?.shift();
	}

	findDMForImportedUsers(...users: Array<string>): Promise<IImportRecord | undefined | null> {
		const query: Filter<IImportRecord> = {
			'dataType': 'channel',
			'data.users': {
				$all: users,
			},
		};

		return this.findOne(query);
	}
}
