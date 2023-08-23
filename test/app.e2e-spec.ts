import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as pactum from 'pactum';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from '../src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);

    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const correctDto: AuthDto = {
      email: 'testuser@email.com',
      password: 'testpass123'
    };

    const badDto: AuthDto = {
      email: 'testuser',
      password: 'testpass123'
    };

    describe('Signup', () => {
      it('Should throw if email is empty', () => {
        return pactum
                .spec()
                .post('/auth/signup')
                .withBody({
                  password: 'pass123'
                })
                .expectStatus(400);
      });

      it('Should throw if password is empty', () => {
        return pactum
                .spec()
                .post('/auth/signup')
                .withBody({
                  email: 'testuser@email.com'
                })
                .expectStatus(400);
      });

      it('Should throw if no body is provided', () => {
        return pactum
                .spec()
                .post('/auth/signup')
                .expectStatus(400);
      });

      it('Should throw with invalid email', () => {
        return pactum
                .spec()
                .post('/auth/signup')
                .withBody(badDto)
                .expectStatus(400);
      });

      it('Should signup with valid DTO', () => {
        return pactum
                .spec()
                .post('/auth/signup')
                .withBody(correctDto)
                .expectStatus(201);
      });
    });

    describe('Signin', () => {
      it('Should throw if email is empty', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .withBody({
                  password: 'pass123'
                })
                .expectStatus(400);
      });

      it('Should throw if password is empty', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .withBody({
                  email: 'testuser@email.com'
                })
                .expectStatus(400);
      });

      it('Should throw if no body is provided', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .expectStatus(400);
      });

      it('Should throw with invalid email', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .withBody(badDto)
                .expectStatus(400);
      });

      it('Should throw with incorrect credentials', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .withBody({
                  email: 'testuser@email.com',
                  password: 'testpass122'
                })
                .expectStatus(403);
      });

      it('Should signin with correct credentials', () => {
        return pactum
                .spec()
                .post('/auth/signin')
                .withBody(correctDto)
                .expectStatus(200)
                .stores('userAt', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('Should get current user', () => {
        return pactum
                .spec()
                .get('/users/me')
                .withBearerToken('$S{userAt}')
                .expectStatus(200);
      });
    });

    describe('Edit user by id', () => {
      const correctDto: EditUserDto = {
        firstName: 'Gabriel',
        email: 'gabriel@email.com'
      }

      it('Should get edit user', () => {
        return pactum
                .spec()
                .patch('/users')
                .withBearerToken('$S{userAt}')
                .withBody(correctDto)
                .expectStatus(200)
                .expectBodyContains(correctDto.firstName)
                .expectBodyContains(correctDto.email)
      });
    });
  });

  describe('Bookmark', () => {
    describe('Get empty bookmarks', () => {
      it('should get no bookmarks', () => {
        return pactum
                .spec()
                .get('/bookmarks')
                .withBearerToken('$S{userAt}')
                .expectStatus(200)
                .expectJsonLength(0);

      });
    });

    describe('Create bookmark', () => {
      const correctDto: CreateBookmarkDto = {
        title: 'My favorite video',
        link: 'https://www.video.com',
        description: 'I love this video!'
      };

      it('should create a bookmark with valid DTO', () => {
        return pactum
                .spec()
                .post('/bookmarks')
                .withBearerToken('$S{userAt}')
                .withBody(correctDto)
                .expectStatus(201)
                .stores('bookmarkId', 'id');
      })
    });

    describe('Get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
                .spec()
                .get('/bookmarks')
                .withBearerToken('$S{userAt}')
                .expectStatus(200)
                .expectJsonLength(1);

      });
    });

    describe('Get bookmark by id', () => {
      it('should get bookmarks', () => {
        return pactum
                .spec()
                .get('/bookmarks/{id}')
                .withPathParams('id', '$S{bookmarkId}')
                .withBearerToken('$S{userAt}')
                .expectStatus(200)
                .expectBodyContains('$S{bookmarkId}');

      });
    });

    describe('Update bookmark by id', () => {
      const correctDto: EditBookmarkDto = {
        description: 'New description!'
      }

      it('should update bookmark with valid DTO', () => {
        return pactum
                .spec()
                .patch('/bookmarks/{id}')
                .withPathParams('id', '$S{bookmarkId}')
                .withBearerToken('$S{userAt}')
                .withBody(correctDto)
                .expectStatus(200)
                .expectBodyContains(correctDto.description);

      });
    });

    describe('Delete bookmark by id', () => {
      it('should delete bookmark', () => {
        return pactum
                .spec()
                .delete('/bookmarks/{id}')
                .withPathParams('id', '$S{bookmarkId}')
                .withBearerToken('$S{userAt}')
                .expectStatus(204);

      });

      it('should get no bookmarks', () => {
        return pactum
                .spec()
                .get('/bookmarks')
                .withBearerToken('$S{userAt}')
                .expectStatus(200)
                .expectJsonLength(0);

      });
    });
  });
});
